import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
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

interface NotificationCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useUser();
  const isPremium = user?.is_premium || false;
  const [isSaving, setIsSaving] = useState(false);
  
  // Bildirim kategori state'leri
  const [notificationCategories, setNotificationCategories] = useState<NotificationCategory[]>([
    {
      id: 'matches',
      title: 'Eşleşmeler',
      description: 'Yeni eşleşme bildirimleri',
      icon: 'account-multiple',
      enabled: true,
    },
    {
      id: 'messages',
      title: 'Mesajlar',
      description: 'Yeni mesaj bildirimleri',
      icon: 'message-text',
      enabled: true,
    },
    {
      id: 'likes',
      title: 'Beğeniler',
      description: 'Profilinizi beğenen kullanıcılar',
      icon: 'heart',
      enabled: true,
    },
    {
      id: 'superlikes',
      title: 'Süper Beğeniler',
      description: 'Profilinizi süper beğenen kullanıcılar',
      icon: 'star',
      enabled: true,
    },
    {
      id: 'gifts',
      title: 'Hediyeler',
      description: 'Size gönderilen hediyeler',
      icon: 'gift',
      enabled: true,
    },
    {
      id: 'profile_views',
      title: 'Profil Görüntülemeleri',
      description: 'Profilinizi görüntüleyen kullanıcılar',
      icon: 'eye',
      enabled: false,
    },
    {
      id: 'app_updates',
      title: 'Uygulama Güncellemeleri',
      description: 'Yeni özellikler ve güncellemeler',
      icon: 'update',
      enabled: true,
    },
    {
      id: 'promos',
      title: 'Promosyonlar',
      description: 'Özel teklifler ve promosyonlar',
      icon: 'tag',
      enabled: false,
    },
  ]);
  
  // Bildirim kanalı ayarları
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');
  
  // Toggle fonksiyonları
  const togglePushNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPushEnabled(!pushEnabled);
  };
  
  const toggleEmailNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEmailEnabled(!emailEnabled);
  };
  
  const toggleInAppNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInAppEnabled(!inAppEnabled);
  };
  
  const toggleSoundNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSoundEnabled(!soundEnabled);
  };
  
  const toggleVibrationNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVibrationEnabled(!vibrationEnabled);
  };
  
  const toggleQuietHours = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Premium kontrolü
    if (!isPremium) {
      Alert.alert(
        'Premium Özellik',
        'Sessiz Saatler özelliğini kullanabilmek için Premium üye olmanız gerekmektedir.',
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Premium Ol', 
            onPress: () => navigation.navigate('PremiumScreen' as never)
          }
        ]
      );
      return;
    }
    
    setQuietHoursEnabled(!quietHoursEnabled);
  };
  
  // Kategori değiştirme
  const toggleCategory = (categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotificationCategories(categories => {
      return categories.map(category => {
        if (category.id === categoryId) {
          return {
            ...category,
            enabled: !category.enabled
          };
        }
        return category;
      });
    });
  };
  
  // Tüm bildirimleri açma/kapatma
  const toggleAllNotifications = (enabled: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNotificationCategories(categories => {
      return categories.map(category => ({
        ...category,
        enabled
      }));
    });
    
    // Bildirim tipini kullanıcı uyarısında gösterme
    const actionText = enabled ? 'açıldı' : 'kapatıldı';
    Alert.alert('Bilgi', `Tüm bildirimler ${actionText}.`);
  };
  
  // Sessiz saatler ayarı
  const setQuietHours = () => {
    // Premium kontrolü
    if (!isPremium) {
      Alert.alert(
        'Premium Özellik',
        'Sessiz Saatler özelliğini kullanabilmek için Premium üye olmanız gerekmektedir.',
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Premium Ol', 
            onPress: () => navigation.navigate('PremiumScreen' as never)
          }
        ]
      );
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sessiz Saatler',
      'Bu özellik yakında kullanıma açılacaktır. Şimdilik sessiz saatler özelliğini açıp kapatabilirsiniz.',
      [{ text: 'Tamam' }]
    );
  };

  // Ayarları kaydet
  const handleSaveSettings = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsSaving(true);
      
      // Ayarları veritabanına kaydetme işlemi burada yapılabilir
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simüle edilmiş kaydetme işlemi
      
      Alert.alert('Başarılı', 'Bildirim ayarlarınız kaydedildi.');
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

  return (
    <LinearGradient
      colors={['#1A1A1A', '#121212']}
      style={styles.container}
    >
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
            <Text style={styles.headerTitle}>Bildirim Ayarları</Text>
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
          {/* Bildirim Kanalları */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bildirim Kanalları</Text>
            <Text style={styles.sectionDescription}>
              Bildirimleri hangi kanallardan almak istediğinizi seçin
            </Text>
            
            {/* Push Bildirimleri */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="bell" 
                  size={24} 
                  color={COLORS.dark.text} 
                />
                <View style={styles.settingItemTextContainer}>
                  <Text style={styles.settingItemTitle}>Push Bildirimleri</Text>
                  <Text style={styles.settingItemDescription}>Telefon bildirimleri</Text>
                </View>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={togglePushNotifications}
                trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                thumbColor={pushEnabled ? COLORS.dark.primary : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
            
            {/* E-posta Bildirimleri */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="email" 
                  size={24} 
                  color={COLORS.dark.text} 
                />
                <View style={styles.settingItemTextContainer}>
                  <Text style={styles.settingItemTitle}>E-posta Bildirimleri</Text>
                  <Text style={styles.settingItemDescription}>E-posta ile bildirimleri alın</Text>
                </View>
              </View>
              <Switch
                value={emailEnabled}
                onValueChange={toggleEmailNotifications}
                trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                thumbColor={emailEnabled ? COLORS.dark.primary : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
            
            {/* Uygulama İçi Bildirimleri */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="application" 
                  size={24} 
                  color={COLORS.dark.text} 
                />
                <View style={styles.settingItemTextContainer}>
                  <Text style={styles.settingItemTitle}>Uygulama İçi Bildirimleri</Text>
                  <Text style={styles.settingItemDescription}>Uygulama içinde bildirimleri göster</Text>
                </View>
              </View>
              <Switch
                value={inAppEnabled}
                onValueChange={toggleInAppNotifications}
                trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                thumbColor={inAppEnabled ? COLORS.dark.primary : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
          </View>
          
          {/* Bildirim Tercihleri */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Bildirim Tercihleri</Text>
              <View style={styles.enableAllContainer}>
                <TouchableOpacity 
                  style={styles.enableAllButton}
                  onPress={() => toggleAllNotifications(true)}
                >
                  <Text style={styles.enableAllButtonText}>Tümünü Aç</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.disableAllButton}
                  onPress={() => toggleAllNotifications(false)}
                >
                  <Text style={styles.disableAllButtonText}>Tümünü Kapat</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Kategori Listesi */}
            {notificationCategories.map((category) => (
              <View key={category.id} style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                  <MaterialCommunityIcons 
                    name={category.icon as any} 
                    size={24} 
                    color={category.enabled ? COLORS.dark.text : COLORS.dark.textSecondary} 
                  />
                  <View style={styles.settingItemTextContainer}>
                    <Text style={[
                      styles.settingItemTitle,
                      !category.enabled && {color: COLORS.dark.textSecondary}
                    ]}>
                      {category.title}
                    </Text>
                    <Text style={styles.settingItemDescription}>
                      {category.description}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={category.enabled}
                  onValueChange={() => toggleCategory(category.id)}
                  trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                  thumbColor={category.enabled ? COLORS.dark.primary : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                />
              </View>
            ))}
          </View>

          {/* Bildirim Ayarları */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bildirim Ayarları</Text>
            
            {/* Ses */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="volume-high" 
                  size={24} 
                  color={COLORS.dark.text} 
                />
                <View style={styles.settingItemTextContainer}>
                  <Text style={styles.settingItemTitle}>Bildirim Sesleri</Text>
                  <Text style={styles.settingItemDescription}>Bildirimlerde ses çal</Text>
                </View>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={toggleSoundNotifications}
                trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                thumbColor={soundEnabled ? COLORS.dark.primary : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
            
            {/* Titreşim */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="vibrate" 
                  size={24} 
                  color={COLORS.dark.text} 
                />
                <View style={styles.settingItemTextContainer}>
                  <Text style={styles.settingItemTitle}>Titreşim</Text>
                  <Text style={styles.settingItemDescription}>Bildirimlerde titreşim</Text>
                </View>
              </View>
              <Switch
                value={vibrationEnabled}
                onValueChange={toggleVibrationNotifications}
                trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                thumbColor={vibrationEnabled ? COLORS.dark.primary : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
            
            {/* Sessiz Saatler */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="clock-time-eight" 
                  size={24} 
                  color={isPremium ? COLORS.dark.text : COLORS.dark.textSecondary} 
                />
                <View style={styles.settingItemTextContainer}>
                  <Text style={[
                    styles.settingItemTitle,
                    !isPremium && {color: COLORS.dark.textSecondary}
                  ]}>Sessiz Saatler</Text>
                  <Text style={styles.settingItemDescription}>
                    {!isPremium ? 'Premium özellik' : 
                      (quietHoursEnabled ? `${quietHoursStart} - ${quietHoursEnd} arası sessiz mod` : 'Kapalı')}
                  </Text>
                </View>
              </View>
              <Switch
                value={quietHoursEnabled}
                onValueChange={toggleQuietHours}
                trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                thumbColor={quietHoursEnabled ? COLORS.dark.primary : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                disabled={!isPremium}
              />
            </View>
            
            {quietHoursEnabled && isPremium && (
              <TouchableOpacity 
                style={styles.quietHoursButton}
                onPress={setQuietHours}
              >
                <Text style={styles.quietHoursButtonText}>Sessiz Saat Ayarları</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Ayarları Kaydet Butonu */}
          <TouchableOpacity
            style={styles.saveSettingsButton}
            onPress={handleSaveSettings}
            disabled={isSaving}
          >
            <LinearGradient
              colors={COLORS.dark.gradient.primary}
              style={styles.saveButtonGradient}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons 
                    name="content-save" 
                    size={20} 
                    color="#FFFFFF" 
                    style={styles.saveButtonIcon} 
                  />
                  <Text style={styles.saveButtonText}>Değişiklikleri Kaydet</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
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
  sectionTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark.text,
    marginBottom: SPACING.xs,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.dark.textSecondary,
    marginBottom: SPACING.md,
  },
  enableAllContainer: {
    flexDirection: 'row',
  },
  enableAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: `${COLORS.dark.primary}30`,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: 8,
  },
  enableAllButtonText: {
    color: COLORS.dark.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  disableAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.sm,
  },
  disableAllButtonText: {
    color: COLORS.dark.textSecondary,
    fontSize: 12,
    fontWeight: '500',
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
  quietHoursButton: {
    padding: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  quietHoursButtonText: {
    color: COLORS.dark.primary,
    fontSize: 14,
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
}); 