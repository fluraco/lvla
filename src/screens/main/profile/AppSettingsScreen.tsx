import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
  Platform,
  StatusBar
} from 'react-native';
import { Text } from 'react-native-elements';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../../../contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../lib/supabase';
import { useFontSize, FONT_SIZE_OPTIONS } from '../../../contexts/FontSizeContext';
import { ScaledText } from '../../../components/common/ScaledText';

// Yazı boyutu ayarını tutmak için context oluşturmadan basit bir obje kullanıyoruz
// Gerçek uygulamada yazı boyutu için bir context kullanmak daha doğru olabilir
export const fontSizeOptions = {
  SMALL: "small",
  MEDIUM: "medium",
  LARGE: "large"
};

export function AppSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, logout, refetchUserData, setUser, darkMode, setDarkMode } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const { fontSize, setFontSize } = useFontSize();
  
  // Ayarlar state'leri
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [autoPlayVideos, setAutoPlayVideos] = useState(true);
  const [dataUsageEnabled, setDataUsageEnabled] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [fontSizeIndex, setFontSizeIndex] = useState(1); // 0: Küçük, 1: Orta, 2: Büyük
  
  const fontSizes = ["Küçük", "Orta", "Büyük"];
  const fontSizeValues = [FONT_SIZE_OPTIONS.SMALL, FONT_SIZE_OPTIONS.MEDIUM, FONT_SIZE_OPTIONS.LARGE];

  // Mevcut yazı boyutu ile fontSizeIndex'i senkronize et
  useEffect(() => {
    // Context'ten gelen fontSize değerine göre fontSizeIndex'i ayarla
    const index = fontSizeValues.indexOf(fontSize);
    if (index !== -1) {
      setFontSizeIndex(index);
    }
  }, [fontSize]);
  
  // Toggle fonksiyonları
  const toggleLocationEnabled = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocationEnabled(!locationEnabled);
  };
  
  const toggleAutoPlayVideos = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAutoPlayVideos(!autoPlayVideos);
  };
  
  const toggleDataUsageEnabled = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDataUsageEnabled(!dataUsageEnabled);
  };
  
  const toggleHapticFeedback = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHapticFeedback(!hapticFeedback);
  };
  
  // Yazı boyutu seçimi
  const handleFontSizeSelect = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFontSizeIndex(index);
    
    // Seçilen yazı boyutunu global context'e hemen uygula
    const selectedSize = fontSizeValues[index];
    setFontSize(selectedSize);
  };

  // Veri silme
  const handleClearCachePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Önbelleği Temizle',
      'Uygulama önbelleğini temizlemek istediğinize emin misiniz? Bu işlem, uygulamanızın performansını geçici olarak etkileyebilir.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: () => {
            // Önbellek temizleme işlemi
            Alert.alert('Başarılı', 'Önbellek temizlendi.');
          },
        },
      ],
    );
  };
  
  // Hesabı dondur işlevi
  const handleFreezeAccountPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Hesabı Dondur',
      'Hesabınız dondurulacak ve diğer üyelere gösterilmeyecektir. Hesabınızı tekrar aktifleştirmek için giriş yapmanız yeterli olacaktır.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Hesabımı Dondur',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSaving(true);
              
              if (user?.id) {
                // Kullanıcı durumunu "paused" olarak güncelle
                const { error } = await supabase
                  .from('users')
                  .update({ status: 'paused' })
                  .eq('id', user.id);
                  
                if (error) {
                  console.error('Hesap dondurma hatası:', error);
                  Alert.alert('Hata', 'Hesabınız dondurulurken bir hata oluştu.');
                  return;
                }
                
                // Kullanıcıyı çıkış yaptır
                await logout();
                
                // Ana ekrana yönlendir
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Auth' as never }],
                });
              }
            } catch (error) {
              console.error('Hesap dondurma hatası:', error);
              Alert.alert('Hata', 'Hesabınız dondurulurken bir hata oluştu.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ],
    );
  };
  
  // Hesap silme işlevi
  const handleDeleteAccountPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Hesabı Sil',
      'Hesabınız silinecektir, 3 gün içinde tekrar giriş yapıp hesabınızı aktif edebilirsiniz. 3 Gün içinde giriş yapmazsanız hesabınız kalıcı olarak silinecektir.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Hesabımı Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSaving(true);
              
              if (user?.id) {
                // Şu anki tarihi kaydedelim ve silinme tarihi hesaplayalım
                const deletedAt = new Date().toISOString();
                
                // Kullanıcı durumunu "deleted" olarak güncelle
                const { error } = await supabase
                  .from('users')
                  .update({ 
                    status: 'deleted', 
                    deleted_at: deletedAt 
                  })
                  .eq('id', user.id);
                  
                if (error) {
                  console.error('Hesap silme hatası:', error);
                  Alert.alert('Hata', 'Hesabınız silinirken bir hata oluştu.');
                  return;
                }
                
                // Kullanıcıyı çıkış yaptır
                await logout();
                
                // Ana ekrana yönlendir
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Auth' as never }],
                });
              }
            } catch (error) {
              console.error('Hesap silme hatası:', error);
              Alert.alert('Hata', 'Hesabınız silinirken bir hata oluştu.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ],
    );
  };

  // Ayarları kaydet
  const handleSaveSettings = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsSaving(true);
      
      // Kullanıcı ayarlarını kaydet
      if (user?.id) {
        // Yazı boyutu ayarını kaydet
        const selectedFontSize = fontSizeValues[fontSizeIndex];
        
        // Diğer ayarları da kaydetmek için kullanıcı verilerini güncelleyebiliriz
        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            font_size: selectedFontSize,
            location_enabled: locationEnabled,
            auto_play_videos: autoPlayVideos,
            data_usage_enabled: dataUsageEnabled,
            haptic_feedback: hapticFeedback,
          }, { onConflict: 'user_id' });
          
        if (error) {
          console.error('Ayarlar kaydedilirken hata oluştu:', error);
          Alert.alert('Hata', 'Ayarlar kaydedilirken bir hata oluştu.');
          return;
        }
      }
      
      Alert.alert('Başarılı', 'Ayarlarınız kaydedildi.');
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata oluştu:', error);
      Alert.alert('Hata', 'Ayarlar kaydedilirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  // Geri dön
  const handleGoBack = () => {
    navigation.goBack();
  };

  // Örnek boyutlar - yazı boyutu değişikliğini göstermek için
  const exampleText = "Bu örnek metin, seçtiğiniz yazı boyutuna göre değişir.";

  return (
    <LinearGradient
      colors={['#1A1A1A', '#121212']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" translucent={false} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 15 : 25 }]}>
          <View style={styles.headerContent}>
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
            <ScaledText style={styles.headerTitle}>Uygulama Ayarları</ScaledText>
            <TouchableOpacity 
              onPress={handleSaveSettings}
              style={styles.saveButton}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={COLORS.dark.primary} />
              ) : (
                <MaterialCommunityIcons 
                  name="check" 
                  size={24} 
                  color={COLORS.dark.primary} 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Görünüm Ayarları */}
          <View style={styles.section}>
            <ScaledText style={styles.sectionTitle}>Görünüm Ayarları</ScaledText>
            
            {/* Yazı Boyutu */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="format-size" 
                  size={24} 
                  color={COLORS.dark.text} 
                />
                <View style={styles.settingItemTextContainer}>
                  <ScaledText style={styles.settingItemTitle}>Yazı Boyutu</ScaledText>
                  <ScaledText style={styles.settingItemDescription}>İçeriklerin yazı boyutu</ScaledText>
                </View>
              </View>
            </View>
            
            <View style={styles.optionsContainer}>
              {fontSizes.map((size, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    fontSizeIndex === index && styles.optionButtonSelected
                  ]}
                  onPress={() => handleFontSizeSelect(index)}
                >
                  <ScaledText 
                    style={[
                      styles.optionButtonText,
                      fontSizeIndex === index && styles.optionButtonTextSelected
                    ]}
                  >
                    {size}
                  </ScaledText>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Örnek metin - yazı boyutu değişimini göstermek için */}
            <View style={styles.fontSizeExample}>
              <ScaledText style={styles.exampleText}>{exampleText}</ScaledText>
            </View>
          </View>

          {/* Veri Kullanımı */}
          <View style={styles.section}>
            <ScaledText style={styles.sectionTitle}>Veri Kullanımı</ScaledText>
            
            {/* Otomatik Video Oynatma */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="play-circle" 
                  size={24} 
                  color={COLORS.dark.text} 
                />
                <View style={styles.settingItemTextContainer}>
                  <ScaledText style={styles.settingItemTitle}>Otomatik Video Oynatma</ScaledText>
                  <ScaledText style={styles.settingItemDescription}>Videoları otomatik oynat</ScaledText>
                </View>
              </View>
              <Switch
                value={autoPlayVideos}
                onValueChange={toggleAutoPlayVideos}
                trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                thumbColor={autoPlayVideos ? COLORS.dark.primary : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
            
            {/* Veri Tasarrufu */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="data-matrix" 
                  size={24} 
                  color={COLORS.dark.text} 
                />
                <View style={styles.settingItemTextContainer}>
                  <ScaledText style={styles.settingItemTitle}>Veri Tasarrufu</ScaledText>
                  <ScaledText style={styles.settingItemDescription}>Mobil veri kullanımını azalt</ScaledText>
                </View>
              </View>
              <Switch
                value={dataUsageEnabled}
                onValueChange={toggleDataUsageEnabled}
                trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                thumbColor={dataUsageEnabled ? COLORS.dark.primary : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
            
            {/* Önbelleği Temizle */}
            <TouchableOpacity 
              style={styles.settingButton}
              onPress={handleClearCachePress}
            >
              <MaterialCommunityIcons 
                name="cached" 
                size={24} 
                color={COLORS.dark.text} 
              />
              <View style={styles.settingItemTextContainer}>
                <ScaledText style={styles.settingItemTitle}>Önbelleği Temizle</ScaledText>
                <ScaledText style={styles.settingItemDescription}>Uygulama önbelleğini temizle</ScaledText>
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Konum ve Erişilebilirlik */}
          <View style={styles.section}>
            <ScaledText style={styles.sectionTitle}>Özellikler</ScaledText>
            
            {/* Konum Servisleri */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="map-marker" 
                  size={24} 
                  color={COLORS.dark.text} 
                />
                <View style={styles.settingItemTextContainer}>
                  <ScaledText style={styles.settingItemTitle}>Konum Servisleri</ScaledText>
                  <ScaledText style={styles.settingItemDescription}>Yakınımdaki kişileri göster</ScaledText>
                </View>
              </View>
              <Switch
                value={locationEnabled}
                onValueChange={toggleLocationEnabled}
                trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                thumbColor={locationEnabled ? COLORS.dark.primary : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
            
            {/* Dokunsal Geri Bildirim */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="vibrate" 
                  size={24} 
                  color={COLORS.dark.text} 
                />
                <View style={styles.settingItemTextContainer}>
                  <ScaledText style={styles.settingItemTitle}>Dokunsal Geri Bildirim</ScaledText>
                  <ScaledText style={styles.settingItemDescription}>Etkileşimlerde titreşim geri bildirimi</ScaledText>
                </View>
              </View>
              <Switch
                value={hapticFeedback}
                onValueChange={toggleHapticFeedback}
                trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                thumbColor={hapticFeedback ? COLORS.dark.primary : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
          </View>
          
          {/* Hesap İşlemleri */}
          <View style={styles.section}>
            <ScaledText style={styles.sectionTitle}>Hesap İşlemleri</ScaledText>
            
            {/* Hesabı Dondur */}
            <TouchableOpacity 
              style={styles.settingButton}
              onPress={handleFreezeAccountPress}
            >
              <MaterialCommunityIcons 
                name="account-cancel" 
                size={24} 
                color={COLORS.dark.warning} 
              />
              <View style={styles.settingItemTextContainer}>
                <ScaledText style={[styles.settingItemTitle, { color: COLORS.dark.warning }]}>Hesabı Dondur</ScaledText>
                <ScaledText style={styles.settingItemDescription}>Hesabınızı geçici olarak devre dışı bırakın</ScaledText>
              </View>
            </TouchableOpacity>
            
            {/* Hesabı Sil */}
            <TouchableOpacity 
              style={styles.settingButton}
              onPress={handleDeleteAccountPress}
            >
              <MaterialCommunityIcons 
                name="delete" 
                size={24} 
                color={COLORS.dark.error} 
              />
              <View style={styles.settingItemTextContainer}>
                <ScaledText style={[styles.settingItemTitle, { color: COLORS.dark.error }]}>Hesabı Sil</ScaledText>
                <ScaledText style={styles.settingItemDescription}>Hesabınızı ve tüm verilerinizi kalıcı olarak silin</ScaledText>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
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
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.dark.text,
  },
  backButton: {
    padding: SPACING.xs,
    borderRadius: 20,
  },
  saveButton: {
    padding: SPACING.xs,
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  section: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark.text,
    marginBottom: SPACING.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: SPACING.sm,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingItemTextContainer: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    color: COLORS.dark.text,
  },
  settingItemDescription: {
    fontSize: 12,
    color: COLORS.dark.textSecondary,
    marginTop: 2,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: SPACING.sm,
  },
  optionsContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  optionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.dark.surface,
    marginRight: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtonSelected: {
    backgroundColor: COLORS.dark.primary,
  },
  optionButtonText: {
    color: COLORS.dark.text,
    fontSize: 14,
  },
  optionButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  saveSettingsButton: {
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  saveButtonIcon: {
    marginRight: SPACING.sm,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fontSizeExample: {
    backgroundColor: COLORS.dark.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  exampleText: {
    color: COLORS.dark.text,
    fontSize: 16,
    textAlign: 'center',
  },
}); 