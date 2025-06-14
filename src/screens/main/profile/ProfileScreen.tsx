import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import { ElementsText } from '../../../components/common/wrappers';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useUser } from '../../../contexts/UserContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../lib/supabase';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../types/navigation';

interface UserStats {
  likes: number;
  matches: number;
  credits: number;
}

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, refetchUserData } = useUser();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    likes: 0,
    matches: 0,
    credits: 0
  });
  const [loading, setLoading] = useState(true);
  const [hasActiveBoost, setHasActiveBoost] = useState(false);

  // Kullanıcı fotoğrafı (varsayılan profil resmi veya rastgele avatar)
  const profileImage = user?.profile_photo || 
    (user?.photos && user.photos.length > 0 ? user.photos[0] : 'https://i.pravatar.cc/300');

  // Yaş hesaplama
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Kullanıcı yaşı
  const userAge = user?.birth_date ? calculateAge(user.birth_date) : null;

  // Sayfa her odaklandığında verileri yenile
  useFocusEffect(
    React.useCallback(() => {
      const loadProfileData = async () => {
        try {
          await refetchUserData();
          fetchStats();
          checkActiveBoost();
        } catch (error) {
          console.error('Profil verilerini yenileme hatası:', error);
        }
      };
      
      loadProfileData();
      
      return () => {
        // Temizleme işlemi gerekirse burada yapılabilir
      };
    }, [user?.id])
  );

  // Profil verileri ilk yüklendiğinde ve odaklanma olmadığında da yenileme
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        await refetchUserData();
        fetchStats();
        checkActiveBoost();
      } catch (error) {
        console.error('Profil verilerini yenileme hatası:', error);
      }
    };
    
    loadProfileData();
  }, []);

  // Kullanıcı istatistiklerini getirme fonksiyonu
  const fetchStats = async () => {
    if (!user || !user.id) return;
    
    try {
      setLoading(true);
      
      // 1. SuperLike sayısını al
      const { data: superLikeData, error: superLikeError } = await supabase
        .rpc('get_user_superlikes', { p_user_id: user.id });
      
      if (superLikeError) {
        console.error('SuperLike sayısı alınırken hata oluştu:', superLikeError);
      }
      
      // 2. Mesaj kredilerini al
      const { data: messageData, error: messageError } = await supabase
        .from('user_message_credits')
        .select('credit_amount')
        .eq('user_id', user.id)
        .single();
      
      if (messageError && messageError.code !== 'PGRST116') {
        console.error('Mesaj kredileri alınırken hata oluştu:', messageError);
      }
      
      // 3. Hediye kredilerini al
      const { data: giftData, error: giftError } = await supabase
        .from('user_credits')
        .select('credit_amount')
        .eq('user_id', user.id)
        .single();
      
      if (giftError && giftError.code !== 'PGRST116') {
        console.error('Hediye kredileri alınırken hata oluştu:', giftError);
      }
      
      // İstatistikleri güncelle
      setStats({
        likes: superLikeData || 0,
        matches: messageData?.credit_amount || 0,
        credits: giftData?.credit_amount || 0
      });
      
    } catch (error) {
      console.error('İstatistikler alınırken hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  };

  // Kullanıcının aktif boost'unu kontrol etme
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
      
      setHasActiveBoost(!!data);
    } catch (error) {
      console.error('Aktif boost kontrolü sırasında hata:', error);
    }
  };

  const handleLogout = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert(
        "Çıkış Yap",
        "Hesabınızdan çıkış yapmak istediğinizden emin misiniz?",
        [
          {
            text: "İptal",
            style: "cancel"
          },
          {
            text: "Çıkış Yap",
            style: "destructive",
            onPress: async () => {
              try {
                await logout();
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Auth' }],
                  })
                );
              } catch (error) {
                console.error('Çıkış hatası:', error);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Çıkış hatası:', error);
    }
  };

  const navigateToEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('EditProfile');
  };

  const navigateToSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Uygulama Ayarları sayfasına yönlendir
    navigation.navigate('AppSettings' as never);
  };

  const navigateToPrivacy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Gizlilik ve Güvenlik ayarları sayfasına yönlendir
    navigation.navigate('PrivacySecurity' as never);
  };

  const navigateToNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Bildirim ayarları sayfasına yönlendir
    navigation.navigate('NotificationSettings' as never);
  };

  const navigateToPremium = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('PremiumScreen' as never);
  };

  const navigateToCredits = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Kredi mağazasına yönlendir (ConsumablesShopScreen'e 'credit' sekmesiyle)
    navigation.navigate('ConsumablesShopScreen', { initialTab: 'credit' });
  };

  const navigateToBoost = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Aktif boost varsa bilgi mesajı göster
    if (hasActiveBoost) {
      Alert.alert(
        "Boost Aktif",
        "Şu anda aktif bir boost\'unuz bulunmaktadır.",
        [{ text: "Tamam", style: "default" }]
      );
      return;
    }
    
    // Boost satın alma sayfasına yönlendirme (ConsumablesShopScreen'e 'boost' sekmesiyle)
    navigation.navigate('ConsumablesShopScreen', { initialTab: 'boost' });
  };

  const navigateToSuperLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // SuperLike satın alma sayfasına yönlendirme (ConsumablesShopScreen'e 'superlike' sekmesiyle)
    navigation.navigate('ConsumablesShopScreen', { initialTab: 'superlike' });
  };

  const navigateToSupportRequest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Destek talebi sayfasına yönlendir
    navigation.navigate('SupportRequest' as never);
  };

  const navigateToAbout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Hakkında sayfasına yönlendir
    navigation.navigate('About' as never);
  };

  return (
    <LinearGradient
      colors={['#1A1A1A', '#121212']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 15 : 25 }]}>
          <View style={styles.headerContent}>
            <ElementsText style={styles.headerTitle}>Profilim</ElementsText>
            <TouchableOpacity 
              onPress={handleLogout} 
              style={styles.logoutButton}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name="logout-variant" 
                size={24} 
                color={COLORS.dark.error}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profil Başlık Kısmı */}
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
              <TouchableOpacity 
                style={styles.editProfileImageButton}
                onPress={navigateToEditProfile}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={COLORS.dark.gradient.primary}
                  style={styles.editProfileImageButtonGradient}
                >
                  <MaterialCommunityIcons name="camera" size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <ElementsText style={styles.name}>
              {user?.first_name || 'İsimsiz'} {user?.last_name || 'Kullanıcı'}{userAge ? `, ${userAge}` : ''}
            </ElementsText>
            
            <View style={styles.locationContainer}>
              <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.dark.textSecondary} />
              <ElementsText style={styles.location}>
                {user?.location?.city && user?.location?.country
                  ? `${user.location.city}, ${user.location.country}`
                  : user?.location?.city || user?.location?.country || 'Konum belirtilmemiş'}
              </ElementsText>
            </View>

            <TouchableOpacity 
              style={styles.editProfileButton}
              onPress={navigateToEditProfile}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={COLORS.dark.gradient.secondary}
                style={styles.editProfileButtonGradient}
              >
                <MaterialCommunityIcons 
                  name="account-edit" 
                  size={16} 
                  color="#FFFFFF" 
                  style={styles.editProfileButtonIcon}
                />
                <ElementsText style={styles.editProfileButtonText}>Profili Düzenle</ElementsText>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* İstatistik Kartları */}
          <View style={styles.statsContainer}>
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={() => navigation.navigate('ConsumablesShopScreen', { initialTab: 'superlike' })}
              style={{flex: 1, marginHorizontal: SPACING.xs}}
            >
              <LinearGradient
                colors={['#2D2D2D', '#252525']}
                style={styles.statCard}
              >
                <MaterialCommunityIcons name="star" size={24} color="#FFD700" />
                <ElementsText style={styles.statNumber}>{loading ? '...' : stats.likes}</ElementsText>
                <ElementsText style={styles.statLabel}>SuperLike</ElementsText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={() => {
                navigation.navigate('ConsumablesShopScreen', { initialTab: 'credit' });
                // Not: credit ekranında alt sekme seçimi için ConsumablesShopScreen içinde mesaj kredisini otomatik seçiyoruz
              }}
              style={{flex: 1, marginHorizontal: SPACING.xs}}
            >
              <LinearGradient
                colors={['#2D2D2D', '#252525']}
                style={styles.statCard}
              >
                <MaterialCommunityIcons name="message-text" size={24} color="#4E54C8" />
                <ElementsText style={styles.statNumber}>{loading ? '...' : stats.matches}</ElementsText>
                <ElementsText style={styles.statLabel}>Mesaj Kredisi</ElementsText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={() => {
                // Hediye kredisi için ConsumablesShopScreen'e yönlendir
                // Credit ekranında alt sekme değişikliği useEffect içinde yapılacak
                navigation.navigate('ConsumablesShopScreen', { initialTab: 'credit' });
              }}
              style={{flex: 1, marginHorizontal: SPACING.xs}}
            >
              <LinearGradient
                colors={['#2D2D2D', '#252525']}
                style={styles.statCard}
              >
                <MaterialCommunityIcons name="gift" size={24} color="#FF8008" />
                <ElementsText style={styles.statNumber}>{loading ? '...' : stats.credits}</ElementsText>
                <ElementsText style={styles.statLabel}>Hediye Kredisi</ElementsText>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Biyografi bölümü */}
          {user?.biography && (
            <View style={styles.bioSection}>
              <ElementsText style={styles.sectionTitle}>Hakkımda</ElementsText>
              <LinearGradient
                colors={['#2D2D2D', '#252525']}
                style={styles.bioCard}
              >
                <ElementsText style={styles.bioText}>{user.biography}</ElementsText>
              </LinearGradient>
            </View>
          )}

          {/* İlgi Alanları */}
          {user?.hobbies && user.hobbies.length > 0 && (
            <View style={styles.hobbySection}>
              <ElementsText style={styles.sectionTitle}>İlgi Alanları</ElementsText>
              <View style={styles.hobbyContainer}>
                {user.hobbies.map((hobby, index) => (
                  <LinearGradient
                    key={index}
                    colors={['#3D3D3D', '#333333']}
                    style={styles.hobbyChip}
                  >
                    <ElementsText style={styles.hobbyText}>{hobby}</ElementsText>
                  </LinearGradient>
                ))}
              </View>
            </View>
          )}

          {/* Hesap Ayarları */}
          <View style={styles.section}>
            <ElementsText style={styles.sectionTitle}>Hesap Ayarları</ElementsText>
            
            {/* Premium Özellikler */}
            <TouchableOpacity 
              style={styles.premiumMenuItem}
              onPress={navigateToPremium}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#9C27B0', '#673AB7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.premiumMenuItemGradient}
              >
                <MaterialCommunityIcons name="crown" size={24} color="#FFFFFF" />
                <View style={styles.menuItemTextContainer}>
                  <ElementsText style={styles.premiumMenuItemText}>Premium Ol</ElementsText>
                  <ElementsText style={styles.premiumMenuItemDescription}>Sınırsız beğeniler, süper beğeniler ve daha fazlası</ElementsText>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
            
            {/* Boost Al */}
            <TouchableOpacity 
              style={styles.premiumMenuItem}
              onPress={navigateToBoost}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={hasActiveBoost ? ['#4CAF50', '#8BC34A'] : ['#FF5722', '#FF9800']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.premiumMenuItemGradient}
              >
                <MaterialCommunityIcons 
                  name={hasActiveBoost ? "rocket-launch-outline" : "rocket"} 
                  size={24} 
                  color="#FFFFFF" 
                />
                <View style={styles.menuItemTextContainer}>
                  <ElementsText style={styles.premiumMenuItemText}>
                    {hasActiveBoost ? "Boost Aktif" : "Boost Al"}
                  </ElementsText>
                  <ElementsText style={styles.premiumMenuItemDescription}>
                    {hasActiveBoost 
                      ? "Profiliniz şu anda ön planda" 
                      : "Profilini ön plana çıkar ve eşleşme şansını artır"}
                  </ElementsText>
                </View>
                <MaterialCommunityIcons 
                  name={hasActiveBoost ? "check-circle" : "chevron-right"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </LinearGradient>
            </TouchableOpacity>
            
            {/* SuperLike Al */}
            <TouchableOpacity 
              style={styles.premiumMenuItem}
              onPress={navigateToSuperLike}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#00BCD4', '#03A9F4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.premiumMenuItemGradient}
              >
                <MaterialCommunityIcons 
                  name="star" 
                  size={24} 
                  color="#FFFFFF" 
                />
                <View style={styles.menuItemTextContainer}>
                  <ElementsText style={styles.premiumMenuItemText}>
                    SuperLike Satın Al
                  </ElementsText>
                  <ElementsText style={styles.premiumMenuItemDescription}>
                    Dikkat çek ve eşleşme şansını 3 kat artır
                  </ElementsText>
                </View>
                <MaterialCommunityIcons 
                  name="chevron-right" 
                  size={24} 
                  color="#FFFFFF" 
                />
              </LinearGradient>
            </TouchableOpacity>
            
            {/* Kredi Satın Al */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={navigateToCredits}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="currency-usd-circle" size={24} color="#4CAF50" />
              <View style={styles.menuItemTextContainer}>
                <ElementsText style={styles.menuItemText}>Kredi Satın Al</ElementsText>
                <ElementsText style={styles.menuItemDescription}>Özel içerikler ve hediyeler için kredi yükle</ElementsText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.dark.textSecondary} />
            </TouchableOpacity>
            
            {/* Profil Düzenleme */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={navigateToEditProfile}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="account-edit" size={24} color={COLORS.dark.text} />
              <View style={styles.menuItemTextContainer}>
                <ElementsText style={styles.menuItemText}>Profil Detaylarını Düzenle</ElementsText>
                <ElementsText style={styles.menuItemDescription}>Fotoğraflar, biyografi ve kişisel bilgiler</ElementsText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.dark.textSecondary} />
            </TouchableOpacity>
            
            {/* Ayarlar */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={navigateToSettings}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="cog" size={24} color={COLORS.dark.text} />
              <View style={styles.menuItemTextContainer}>
                <ElementsText style={styles.menuItemText}>Uygulama Ayarları</ElementsText>
                <ElementsText style={styles.menuItemDescription}>Tercihler, bağlantılar ve hesap yönetimi</ElementsText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.dark.textSecondary} />
            </TouchableOpacity>
            
            {/* Gizlilik */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={navigateToPrivacy}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="shield-lock" size={24} color={COLORS.dark.text} />
              <View style={styles.menuItemTextContainer}>
                <ElementsText style={styles.menuItemText}>Gizlilik ve Güvenlik</ElementsText>
                <ElementsText style={styles.menuItemDescription}>Gizlilik ayarları, konum ve görünürlük</ElementsText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.dark.textSecondary} />
            </TouchableOpacity>
            
            {/* Bildirimler */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={navigateToNotifications}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="bell" size={24} color={COLORS.dark.text} />
              <View style={styles.menuItemTextContainer}>
                <ElementsText style={styles.menuItemText}>Bildirim Ayarları</ElementsText>
                <ElementsText style={styles.menuItemDescription}>Push bildirimleri ve e-posta tercihleri</ElementsText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.dark.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Yardım ve Destek */}
          <View style={styles.section}>
            <ElementsText style={styles.sectionTitle}>Yardım ve Destek</ElementsText>
            
            <TouchableOpacity 
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={navigateToSupportRequest}
            >
              <MaterialCommunityIcons name="lifebuoy" size={24} color={COLORS.dark.text} />
              <View style={styles.menuItemTextContainer}>
                <ElementsText style={styles.menuItemText}>Destek Talebi</ElementsText>
                <ElementsText style={styles.menuItemDescription}>Sorun bildir veya destek al</ElementsText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.dark.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={navigateToAbout}
            >
              <MaterialCommunityIcons name="information" size={24} color={COLORS.dark.text} />
              <View style={styles.menuItemTextContainer}>
                <ElementsText style={styles.menuItemText}>Hakkında</ElementsText>
                <ElementsText style={styles.menuItemDescription}>Uygulama versiyonu ve yasal bilgiler</ElementsText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.dark.textSecondary} />
            </TouchableOpacity>
          </View>
          
          {/* Çıkış Butonu */}
          <TouchableOpacity 
            style={styles.logoutFullButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="logout" size={24} color={COLORS.dark.error} />
            <ElementsText style={styles.logoutFullButtonText}>Çıkış Yap</ElementsText>
          </TouchableOpacity>

          <View style={styles.versionInfo}>
            <ElementsText style={styles.versionText}>Sürüm 1.0.0</ElementsText>
          </View>
        </ScrollView>
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
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(26,26,26,0.98)',
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: TYPOGRAPHY.h3.fontWeight,
    color: COLORS.dark.text,
  },
  logoutButton: {
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.circular,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: BORDER_RADIUS.circular,
    borderWidth: 3,
    borderColor: COLORS.dark.primary,
    ...SHADOWS.medium,
  },
  editProfileImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: BORDER_RADIUS.circular,
    overflow: 'hidden',
  },
  editProfileImageButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.circular,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark.text,
    marginBottom: SPACING.xs,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  location: {
    fontSize: 16,
    color: COLORS.dark.textSecondary,
    marginLeft: 4,
  },
  editProfileButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  editProfileButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  editProfileButtonIcon: {
    marginRight: SPACING.xs,
  },
  editProfileButtonText: {
    color: COLORS.dark.text,
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark.text,
    marginVertical: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.dark.textSecondary,
  },
  bioSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  bioCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.dark.text,
  },
  hobbySection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  hobbyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  hobbyChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  hobbyText: {
    color: COLORS.dark.text,
    fontSize: 13,
  },
  section: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark.text,
    marginBottom: SPACING.md,
  },
  premiumMenuItem: {
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  premiumMenuItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.dark.surface,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  menuItemTextContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  menuItemText: {
    fontSize: 16,
    color: COLORS.dark.text,
  },
  menuItemDescription: {
    fontSize: 12,
    color: COLORS.dark.textSecondary,
    marginTop: 2,
  },
  premiumMenuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  premiumMenuItemDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  logoutFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(255,71,87,0.15)',
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  logoutFullButtonText: {
    color: COLORS.dark.error,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  versionInfo: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  versionText: {
    color: COLORS.dark.textSecondary,
    fontSize: 12,
  },
}); 