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
  StatusBar,
} from 'react-native';
import { ElementsText } from '../../../components/common/wrappers';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser, PrivacySettings } from '../../../contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../lib/supabase';

export function PrivacySecurityScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, updatePrivacySettings } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  
  // Gizlilik ve Güvenlik Ayarları
  const [profileVisibility, setProfileVisibility] = useState<'everyone' | 'matches' | 'nobody'>(
    user?.privacy_settings?.profile_visibility || 'everyone'
  );
  const [onlineStatus, setOnlineStatus] = useState(
    user?.privacy_settings?.online_status ?? true
  );
  const [locationSharing, setLocationSharing] = useState(
    user?.privacy_settings?.location_sharing ?? true
  );
  const [photoSharing, setPhotoSharing] = useState(
    user?.privacy_settings?.photo_sharing ?? true
  );
  const [lastSeenEnabled, setLastSeenEnabled] = useState(
    user?.privacy_settings?.last_seen ?? true
  );
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(
    user?.privacy_settings?.read_receipts ?? true
  );
  const [activityStatus, setActivityStatus] = useState(
    user?.privacy_settings?.activity_status ?? true
  );
  const [blockedAccounts, setBlockedAccounts] = useState<string[]>([]);

  // Kullanıcı değiştiğinde ayarları güncelle
  useEffect(() => {
    if (user?.privacy_settings) {
      setProfileVisibility(user.privacy_settings.profile_visibility || 'everyone');
      setOnlineStatus(user.privacy_settings.online_status ?? true);
      setLocationSharing(user.privacy_settings.location_sharing ?? true);
      setPhotoSharing(user.privacy_settings.photo_sharing ?? true);
      setLastSeenEnabled(user.privacy_settings.last_seen ?? true);
      setReadReceiptsEnabled(user.privacy_settings.read_receipts ?? true);
      setActivityStatus(user.privacy_settings.activity_status ?? true);
    }
  }, [user]);
  
  // Toggle fonksiyonları
  const toggleOnlineStatus = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOnlineStatus(!onlineStatus);
  };
  
  const toggleLocationSharing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocationSharing(!locationSharing);
  };
  
  const togglePhotoSharing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotoSharing(!photoSharing);
  };
  
  const toggleLastSeen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLastSeenEnabled(!lastSeenEnabled);
  };
  
  const toggleReadReceipts = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReadReceiptsEnabled(!readReceiptsEnabled);
  };
  
  const toggleActivityStatus = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActivityStatus(!activityStatus);
  };
  
  // Profil görünürlüğü ayarları
  const handleProfileVisibilityChange = (visibility: 'everyone' | 'matches' | 'nobody') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setProfileVisibility(visibility);
  };
  
  // Engellenen hesapları yönetme
  const navigateToBlockedAccounts = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Engellenen hesaplar sayfasına yönlendir
    navigation.navigate('BlockedAccounts' as never);
  };
  
  // Veri indirme
  const handleExportData = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Verilerimi İndir',
      'Tüm verilerinizin bir kopyası e-posta adresinize gönderilecektir. Bu işlem birkaç gün sürebilir.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'İndir',
          onPress: () => {
            // Veri indirme işlemi başlat
            Alert.alert('Bilgi', 'Veri indirme talebiniz alındı. Bir kopyası e-posta adresinize gönderilecektir.');
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
      
      // Güncellenmiş gizlilik ayarlarını oluştur
      const updatedPrivacySettings: PrivacySettings = {
        profile_visibility: profileVisibility,
        online_status: onlineStatus,
        location_sharing: locationSharing,
        photo_sharing: photoSharing,
        last_seen: lastSeenEnabled,
        read_receipts: readReceiptsEnabled,
        activity_status: activityStatus,
      };
      
      // Gizlilik ayarlarını veritabanında güncelle
      await updatePrivacySettings(updatedPrivacySettings);
      
      Alert.alert('Başarılı', 'Gizlilik ve güvenlik ayarlarınız kaydedildi.');
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
            <ElementsText style={styles.headerTitle}>Gizlilik ve Güvenlik</ElementsText>
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
          {/* Görünürlük Ayarları */}
          <View style={styles.section}>
            <ElementsText style={styles.sectionTitle}>Profil Görünürlüğü</ElementsText>
            
            <ElementsText style={styles.sectionDescription}>
              Profilinizi kimlerin görebileceğini kontrol edin
            </ElementsText>
            
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  profileVisibility === 'everyone' && styles.optionButtonSelected
                ]}
                onPress={() => handleProfileVisibilityChange('everyone')}
              >
                <MaterialCommunityIcons
                  name="earth"
                  size={20}
                  color={profileVisibility === 'everyone' ? '#FFFFFF' : COLORS.dark.text}
                  style={styles.optionIcon}
                />
                <ElementsText 
                  style={[
                    styles.optionButtonText,
                    profileVisibility === 'everyone' && styles.optionButtonTextSelected
                  ]}
                >
                  Herkes
                </ElementsText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  profileVisibility === 'matches' && styles.optionButtonSelected
                ]}
                onPress={() => handleProfileVisibilityChange('matches')}
              >
                <MaterialCommunityIcons
                  name="account-group"
                  size={20}
                  color={profileVisibility === 'matches' ? '#FFFFFF' : COLORS.dark.text}
                  style={styles.optionIcon}
                />
                <ElementsText 
                  style={[
                    styles.optionButtonText,
                    profileVisibility === 'matches' && styles.optionButtonTextSelected
                  ]}
                >
                  Eşleştiklerim
                </ElementsText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  profileVisibility === 'nobody' && styles.optionButtonSelected
                ]}
                onPress={() => handleProfileVisibilityChange('nobody')}
              >
                <MaterialCommunityIcons
                  name="lock"
                  size={20}
                  color={profileVisibility === 'nobody' ? '#FFFFFF' : COLORS.dark.text}
                  style={styles.optionIcon}
                />
                <ElementsText 
                  style={[
                    styles.optionButtonText,
                    profileVisibility === 'nobody' && styles.optionButtonTextSelected
                  ]}
                >
                  Hiçkimse
                </ElementsText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Gizlilik Ayarları */}
          <View style={styles.section}>
            <ElementsText style={styles.sectionTitle}>Gizlilik Ayarları</ElementsText>
            
            {/* Çevrimiçi Durumu */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="circle" 
                  size={24} 
                  color="#4CAF50" 
                />
                <View style={styles.settingItemTextContainer}>
                  <ElementsText style={styles.settingItemTitle}>Çevrimiçi Durumu</ElementsText>
                  <ElementsText style={styles.settingItemDescription}>Diğer kullanıcılara çevrimiçi olduğunuzu gösterin</ElementsText>
                </View>
              </View>
              <Switch
                value={onlineStatus}
                onValueChange={toggleOnlineStatus}
                trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                thumbColor={onlineStatus ? COLORS.dark.primary : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
            
            {/* Konum Paylaşımı */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="map-marker" 
                  size={24} 
                  color={COLORS.dark.text} 
                />
                <View style={styles.settingItemTextContainer}>
                  <ElementsText style={styles.settingItemTitle}>Konum Paylaşımı</ElementsText>
                  <ElementsText style={styles.settingItemDescription}>Konumunuzu diğer kullanıcılarla paylaşın</ElementsText>
                </View>
              </View>
              <Switch
                value={locationSharing}
                onValueChange={toggleLocationSharing}
                trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                thumbColor={locationSharing ? COLORS.dark.primary : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
            
            {/* Fotoğraf Paylaşımı */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="image" 
                  size={24} 
                  color={COLORS.dark.text} 
                />
                <View style={styles.settingItemTextContainer}>
                  <ElementsText style={styles.settingItemTitle}>Fotoğraf Paylaşımı</ElementsText>
                  <ElementsText style={styles.settingItemDescription}>Tüm fotoğraflarınızı diğer kullanıcılarla paylaşın (kapalıysa sadece profil fotoğrafınız görünür)</ElementsText>
                </View>
              </View>
              <Switch
                value={photoSharing}
                onValueChange={togglePhotoSharing}
                trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                thumbColor={photoSharing ? COLORS.dark.primary : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
            
            {/* Son Görülme */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="clock" 
                  size={24} 
                  color={COLORS.dark.text} 
                />
                <View style={styles.settingItemTextContainer}>
                  <ElementsText style={styles.settingItemTitle}>Son Görülme</ElementsText>
                  <ElementsText style={styles.settingItemDescription}>Son çevrimiçi olduğunuz zamanı gösterin</ElementsText>
                </View>
              </View>
              <Switch
                value={lastSeenEnabled}
                onValueChange={toggleLastSeen}
                trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                thumbColor={lastSeenEnabled ? COLORS.dark.primary : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
            
            {/* Okundu Bildirimleri */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="check-all" 
                  size={24} 
                  color={COLORS.dark.text} 
                />
                <View style={styles.settingItemTextContainer}>
                  <ElementsText style={styles.settingItemTitle}>Okundu Bildirimleri</ElementsText>
                  <ElementsText style={styles.settingItemDescription}>Mesajların okunduğunu gönderene bildirin</ElementsText>
                </View>
              </View>
              <Switch
                value={readReceiptsEnabled}
                onValueChange={toggleReadReceipts}
                trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                thumbColor={readReceiptsEnabled ? COLORS.dark.primary : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
            
            {/* Aktivite Durumu */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons 
                  name="run" 
                  size={24} 
                  color={COLORS.dark.text} 
                />
                <View style={styles.settingItemTextContainer}>
                  <ElementsText style={styles.settingItemTitle}>Aktivite Durumu</ElementsText>
                  <ElementsText style={styles.settingItemDescription}>Uygulama içi aktivitenizi diğer kullanıcılara gösterin</ElementsText>
                </View>
              </View>
              <Switch
                value={activityStatus}
                onValueChange={toggleActivityStatus}
                trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                thumbColor={activityStatus ? COLORS.dark.primary : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
          </View>
          
          {/* Güvenlik Ayarları */}
          <View style={styles.section}>
            <ElementsText style={styles.sectionTitle}>Güvenlik Ayarları</ElementsText>
            
            {/* Engellenen Hesaplar */}
            <TouchableOpacity 
              style={styles.settingButton}
              onPress={navigateToBlockedAccounts}
            >
              <MaterialCommunityIcons 
                name="account-cancel" 
                size={24} 
                color={COLORS.dark.text} 
              />
              <View style={styles.settingItemTextContainer}>
                <ElementsText style={styles.settingItemTitle}>Engellenen Hesaplar</ElementsText>
                <ElementsText style={styles.settingItemDescription}>Engellediğiniz kullanıcıları yönetin</ElementsText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.dark.textSecondary} />
            </TouchableOpacity>
          </View>
          
          {/* Veri Yönetimi */}
          <View style={styles.section}>
            <ElementsText style={styles.sectionTitle}>Veri Yönetimi</ElementsText>
            
            {/* Verilerimi İndir */}
            <TouchableOpacity 
              style={styles.settingButton}
              onPress={handleExportData}
            >
              <MaterialCommunityIcons 
                name="cloud-download" 
                size={24} 
                color={COLORS.dark.text} 
              />
              <View style={styles.settingItemTextContainer}>
                <ElementsText style={styles.settingItemTitle}>Verilerimi İndir</ElementsText>
                <ElementsText style={styles.settingItemDescription}>Tüm verilerinizin bir kopyasını alın</ElementsText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.dark.textSecondary} />
            </TouchableOpacity>
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
                  <ElementsText style={styles.saveButtonText}>Değişiklikleri Kaydet</ElementsText>
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
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  optionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    backgroundColor: COLORS.dark.surface,
    marginRight: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  optionButtonSelected: {
    backgroundColor: COLORS.dark.primary,
  },
  optionButtonText: {
    color: COLORS.dark.text,
    fontSize: 12,
    textAlign: 'center',
  },
  optionButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  optionIcon: {
    marginRight: 4,
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
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
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