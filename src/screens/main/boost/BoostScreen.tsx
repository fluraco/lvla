import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../theme';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../contexts/UserContext';
import { ElementsText } from '../../../components/common/wrappers';

interface BoostPackage {
  id: number;
  name: string;
  duration: number; // saat cinsinden
  price: number;
  description: string;
  primary_color: string;
  secondary_color: string;
  icon: string;
}

export function BoostScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, refetchUserData } = useUser();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [boostPackages, setBoostPackages] = useState<BoostPackage[]>([]);
  const [activeBoost, setActiveBoost] = useState<any>(null);

  useEffect(() => {
    fetchBoostPackages();
    checkActiveBoost();
  }, []);

  const fetchBoostPackages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('boost_packages')
        .select('*')
        .order('duration', { ascending: true });

      if (error) {
        console.error('Boost paketleri alınırken hata oluştu:', error);
        return;
      }

      // Veritabanından boost paketleri gelmezse varsayılan paketleri göster
      if (!data || data.length === 0) {
        setBoostPackages([
          {
            id: 1,
            name: '1 Saat Boost',
            duration: 1,
            price: 259.99,
            description: 'Profilinizi 1 saat boyunca ön plana çıkarın',
            primary_color: '#FF5722',
            secondary_color: '#FF9800',
            icon: 'rocket'
          },
          {
            id: 2,
            name: '3 Saat Boost',
            duration: 3,
            price: 359.99,
            description: 'Profilinizi 3 saat boyunca ön plana çıkarın',
            primary_color: '#E91E63',
            secondary_color: '#F44336',
            icon: 'rocket-launch'
          },
          {
            id: 3,
            name: '24 Saat Boost',
            duration: 24,
            price: 999.99,
            description: 'Profilinizi tam gün boyunca ön plana çıkarın',
            primary_color: '#9C27B0',
            secondary_color: '#673AB7',
            icon: 'rocket-launch-outline'
          }
        ]);
      } else {
        setBoostPackages(data);
      }
    } catch (error) {
      console.error('Boost paketleri alınırken hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkActiveBoost = async () => {
    if (!user || !user.id) return;

    try {
      const { data, error } = await supabase
        .from('user_boosts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: kayıt bulunamadı hatası
        console.error('Aktif boost kontrolü sırasında hata:', error);
        return;
      }

      setActiveBoost(data || null);
    } catch (error) {
      console.error('Aktif boost kontrolü sırasında hata:', error);
    }
  };

  const handlePurchaseBoost = async (boostPackage: BoostPackage) => {
    if (!user || !user.id) {
      Alert.alert('Hata', 'Lütfen giriş yapın');
      return;
    }

    if (activeBoost) {
      Alert.alert('Bilgi', 'Zaten aktif bir boost\'unuz bulunmaktadır.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Kullanıcının veritabanında var olup olmadığını kontrol et
      const { data: userExists, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (userCheckError || !userExists) {
        console.error('Kullanıcı kontrolü sırasında hata:', userCheckError);
        Alert.alert(
          'Hata', 
          'Kullanıcı profili bulunamadı. Lütfen uygulamayı yeniden başlatın.',
          [
            { text: 'Tamam', onPress: () => navigation.navigate('Login' as never) }
          ]
        );
        return;
      }
      
      Alert.alert(
        "Boost Satın Al",
        `${boostPackage.name} paketini ${boostPackage.price.toFixed(2)} TL karşılığında satın almak istediğinize emin misiniz?`,
        [
          { text: "İptal", style: "cancel" },
          {
            text: "Satın Al",
            onPress: async () => {
              try {
                setPurchasing(true);
                
                // Boost bitiş zamanını hesapla
                const now = new Date();
                const endTime = new Date(now.getTime() + (boostPackage.duration * 60 * 60 * 1000));
                
                // Kullanıcı boost kaydını oluştur
                const { data, error } = await supabase
                  .from('user_boosts')
                  .insert({
                    user_id: user.id,
                    package_id: boostPackage.id,
                    start_time: now.toISOString(),
                    end_time: endTime.toISOString(),
                    is_active: true,
                    amount_paid: boostPackage.price
                  })
                  .select()
                  .single();
                
                if (error) {
                  console.error('Boost satın alırken hata oluştu:', error);
                  
                  // Daha detaylı hata mesajı göster
                  let errorMessage = 'Boost satın alırken bir sorun oluştu.';
                  
                  if (error.code === '23503') {
                    errorMessage = 'Kullanıcı profili bulunamadı. Lütfen yeniden giriş yapın veya destek ekibimize başvurun.';
                  } else if (error.code === '23505') {
                    errorMessage = 'Bu paketi zaten satın almışsınız.';
                  }
                  
                  Alert.alert('Hata', errorMessage, [
                    { 
                      text: 'Tamam',
                      style: 'default'
                    },
                    {
                      text: 'Desteğe Başvur',
                      onPress: () => {
                        // Burada destek ekranına yönlendirme yapabilirsiniz
                        navigation.navigate('Support' as never, { errorDetails: JSON.stringify(error) } as never);
                      }
                    }
                  ]);
                  return;
                }
                
                // Başarılı satın alma
                setActiveBoost(data);
                Alert.alert('Başarılı', `${boostPackage.name} başarıyla satın alındı!`);
                
                // Kullanıcı verilerini yenile
                if (refetchUserData) {
                  await refetchUserData();
                }
                
                // Ana ekrana geri dön
                navigation.goBack();
              } catch (error) {
                console.error('Boost satın alırken hata oluştu:', error);
                Alert.alert('Hata', 'Boost satın alırken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
              } finally {
                setPurchasing(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Boost satın alırken hata oluştu:', error);
      Alert.alert('Hata', 'Boost satın alırken bir sorun oluştu.');
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  // Kalan süreyi hesaplama
  const calculateRemainingTime = () => {
    if (!activeBoost || !activeBoost.end_time) return null;
    
    const now = new Date();
    const endTime = new Date(activeBoost.end_time);
    const diffMs = endTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return null;
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHrs}s ${diffMins}dk`;
  };

  return (
    <LinearGradient
      colors={['#1A1A1A', '#121212']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 10 : 10 }]}>
          <TouchableOpacity 
            onPress={handleGoBack}
            style={styles.backButton}
          >
            <MaterialCommunityIcons 
              name="arrow-left" 
              size={24} 
              color={COLORS.dark.text} 
            />
          </TouchableOpacity>
          <ElementsText style={styles.headerTitle}>Boost Al</ElementsText>
          <View style={styles.headerRight} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.dark.primary} />
          </View>
        ) : (
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {activeBoost ? (
              <View style={styles.activeBoostContainer}>
                <LinearGradient
                  colors={['#FF5722', '#FF9800']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeBoostCard}
                >
                  <MaterialCommunityIcons name="rocket" size={40} color="#FFFFFF" />
                  <ElementsText style={styles.activeBoostTitle}>Boost Aktif!</ElementsText>
                  <ElementsText style={styles.activeBoostDescription}>
                    Profiliniz şu anda boost edilmiş durumda.
                  </ElementsText>
                  {calculateRemainingTime() && (
                    <View style={styles.remainingTimeContainer}>
                      <MaterialCommunityIcons name="clock-outline" size={20} color="#FFFFFF" />
                      <ElementsText style={styles.remainingTimeText}>
                        Kalan süre: {calculateRemainingTime()}
                      </ElementsText>
                    </View>
                  )}
                </LinearGradient>
              </View>
            ) : (
              <>
                <View style={styles.infoCard}>
                  <MaterialCommunityIcons name="information-outline" size={24} color={COLORS.dark.text} />
                  <ElementsText style={styles.infoText}>
                    Boost satın alarak profilinizi belirli bir süre boyunca diğer kullanıcılara öncelikli olarak gösterin ve eşleşme şansınızı artırın.
                  </ElementsText>
                </View>

                {boostPackages.map((boostPackage) => (
                  <TouchableOpacity
                    key={boostPackage.id}
                    style={styles.packageCard}
                    onPress={() => handlePurchaseBoost(boostPackage)}
                    activeOpacity={0.8}
                    disabled={purchasing}
                  >
                    <LinearGradient
                      colors={[boostPackage.primary_color, boostPackage.secondary_color]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.packageGradient}
                    >
                      <View style={styles.packageHeader}>
                        <MaterialCommunityIcons 
                          name={boostPackage.icon as any} 
                          size={32} 
                          color="#FFFFFF" 
                        />
                        <ElementsText style={styles.packageName}>{boostPackage.name}</ElementsText>
                      </View>
                      <ElementsText style={styles.packageDescription}>
                        {boostPackage.description}
                      </ElementsText>
                      <View style={styles.packagePriceContainer}>
                        <ElementsText style={styles.packagePrice}>
                          {boostPackage.price.toFixed(2)} TL
                        </ElementsText>
                      </View>
                      <View style={styles.packageButton}>
                        <ElementsText style={styles.packageButtonText}>SATIN AL</ElementsText>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <View style={styles.infoBox}>
              <ElementsText style={styles.infoBoxTitle}>Boost Nedir?</ElementsText>
              <ElementsText style={styles.infoBoxText}>
                Boost, profilinizi diğer kullanıcılara gösterme önceliğini artıran özel bir özelliktir. Boost aktifken:
              </ElementsText>
              <View style={styles.infoBoxItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.dark.primary} />
                <ElementsText style={styles.infoBoxItemText}>
                  Profiliniz eşleştirme sırasında öncelikli olarak gösterilir
                </ElementsText>
              </View>
              <View style={styles.infoBoxItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.dark.primary} />
                <ElementsText style={styles.infoBoxItemText}>
                  Eşleşme şansınız %150'ye kadar artar
                </ElementsText>
              </View>
              <View style={styles.infoBoxItem}>
                <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.dark.primary} />
                <ElementsText style={styles.infoBoxItemText}>
                  Profilinize daha fazla ziyaretçi çekersiniz
                </ElementsText>
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(26,26,26,0.98)',
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: TYPOGRAPHY.h3.fontWeight,
    color: COLORS.dark.text,
  },
  headerRight: {
    width: 24,
    height: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark.text,
    marginLeft: SPACING.sm,
  },
  packageCard: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  packageGradient: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  packageName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: SPACING.sm,
  },
  packageDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: SPACING.md,
  },
  packagePriceContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    alignSelf: 'flex-start',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  packageButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  packageButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  activeBoostContainer: {
    marginBottom: SPACING.md,
  },
  activeBoostCard: {
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  activeBoostTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: SPACING.sm,
  },
  activeBoostDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  remainingTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  remainingTimeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: SPACING.xs,
  },
  infoBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  infoBoxTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark.text,
    marginBottom: SPACING.sm,
  },
  infoBoxText: {
    fontSize: 14,
    color: COLORS.dark.textSecondary,
    marginBottom: SPACING.sm,
  },
  infoBoxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  infoBoxItemText: {
    fontSize: 14,
    color: COLORS.dark.text,
    marginLeft: SPACING.sm,
    flex: 1,
  },
}); 