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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ElementsText } from '../../../components/common/wrappers';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../theme';
import * as Haptics from 'expo-haptics';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';

export function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  
  // Bildirim ayarları
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [matchNotifications, setMatchNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [likeNotifications, setLikeNotifications] = useState(true);
  const [systemNotifications, setSystemNotifications] = useState(true);
  
  useEffect(() => {
    fetchNotificationSettings();
  }, [user?.id]);
  
  // Bildirim ayarlarını getir
  const fetchNotificationSettings = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Bildirim ayarları alınamadı:', error);
        return;
      }
      
      // Eğer veri varsa, ayarları güncelle
      if (data) {
        setPushNotifications(data.push_enabled ?? true);
        setEmailNotifications(data.email_enabled ?? true);
        setMatchNotifications(data.match_notifications ?? true);
        setMessageNotifications(data.message_notifications ?? true);
        setLikeNotifications(data.like_notifications ?? true);
        setSystemNotifications(data.system_notifications ?? true);
      }
    } catch (error) {
      console.error('Bildirim ayarları alınırken hata oluştu:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Ayarları kaydet
  const saveNotificationSettings = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: user.id,
          push_enabled: pushNotifications,
          email_enabled: emailNotifications,
          match_notifications: matchNotifications,
          message_notifications: messageNotifications,
          like_notifications: likeNotifications,
          system_notifications: systemNotifications,
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('Bildirim ayarları kaydedilemedi:', error);
        Alert.alert('Hata', 'Bildirim ayarları kaydedilemedi');
        return;
      }
      
      Alert.alert('Başarılı', 'Bildirim ayarlarınız kaydedildi');
    } catch (error) {
      console.error('Bildirim ayarları kaydedilirken hata oluştu:', error);
      Alert.alert('Hata', 'Bildirim ayarları kaydedilirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle fonksiyonları
  const togglePushNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPushNotifications(prev => !prev);
  };
  
  const toggleEmailNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEmailNotifications(prev => !prev);
  };
  
  const toggleMatchNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMatchNotifications(prev => !prev);
  };
  
  const toggleMessageNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMessageNotifications(prev => !prev);
  };
  
  const toggleLikeNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLikeNotifications(prev => !prev);
  };
  
  const toggleSystemNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSystemNotifications(prev => !prev);
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
        <View style={styles.header}>
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
            <ElementsText style={styles.headerTitle}>Bildirim Ayarları</ElementsText>
            <View style={{ width: 24 }} />
          </View>
        </View>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.dark.primary} />
            <ElementsText style={styles.loadingText}>Bildirim ayarları yükleniyor...</ElementsText>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <ElementsText style={styles.sectionTitle}>Genel Bildirim Ayarları</ElementsText>
              
              {/* Push Bildirimleri */}
              <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                  <MaterialCommunityIcons 
                    name="bell" 
                    size={24} 
                    color={COLORS.dark.primary} 
                  />
                  <View style={styles.settingItemTextContainer}>
                    <ElementsText style={styles.settingItemTitle}>Push Bildirimleri</ElementsText>
                    <ElementsText style={styles.settingItemDescription}>
                      Yeni bildirimler için anlık uyarı al
                    </ElementsText>
                  </View>
                </View>
                <Switch
                  value={pushNotifications}
                  onValueChange={togglePushNotifications}
                  trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                  thumbColor={pushNotifications ? COLORS.dark.primary : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                />
              </View>
              
              {/* E-posta Bildirimleri */}
              <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                  <MaterialCommunityIcons 
                    name="email" 
                    size={24} 
                    color={COLORS.dark.primary} 
                  />
                  <View style={styles.settingItemTextContainer}>
                    <ElementsText style={styles.settingItemTitle}>E-posta Bildirimleri</ElementsText>
                    <ElementsText style={styles.settingItemDescription}>
                      Önemli güncellemeler için e-posta al
                    </ElementsText>
                  </View>
                </View>
                <Switch
                  value={emailNotifications}
                  onValueChange={toggleEmailNotifications}
                  trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                  thumbColor={emailNotifications ? COLORS.dark.primary : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                />
              </View>
            </View>
            
            <View style={styles.section}>
              <ElementsText style={styles.sectionTitle}>Bildirim Türleri</ElementsText>
              
              {/* Eşleşme Bildirimleri */}
              <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                  <MaterialCommunityIcons 
                    name="heart" 
                    size={24} 
                    color="#FF4B7E" 
                  />
                  <View style={styles.settingItemTextContainer}>
                    <ElementsText style={styles.settingItemTitle}>Eşleşme Bildirimleri</ElementsText>
                    <ElementsText style={styles.settingItemDescription}>
                      Yeni eşleşmeleriniz olduğunda bildirim alın
                    </ElementsText>
                  </View>
                </View>
                <Switch
                  value={matchNotifications}
                  onValueChange={toggleMatchNotifications}
                  trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                  thumbColor={matchNotifications ? COLORS.dark.primary : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                />
              </View>
              
              {/* Mesaj Bildirimleri */}
              <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                  <MaterialCommunityIcons 
                    name="chat" 
                    size={24} 
                    color="#4CCFF8" 
                  />
                  <View style={styles.settingItemTextContainer}>
                    <ElementsText style={styles.settingItemTitle}>Mesaj Bildirimleri</ElementsText>
                    <ElementsText style={styles.settingItemDescription}>
                      Yeni mesaj aldığınızda bildirim alın
                    </ElementsText>
                  </View>
                </View>
                <Switch
                  value={messageNotifications}
                  onValueChange={toggleMessageNotifications}
                  trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                  thumbColor={messageNotifications ? COLORS.dark.primary : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                />
              </View>
              
              {/* Beğeni Bildirimleri */}
              <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                  <MaterialCommunityIcons 
                    name="thumb-up" 
                    size={24} 
                    color="#FF4B7E" 
                  />
                  <View style={styles.settingItemTextContainer}>
                    <ElementsText style={styles.settingItemTitle}>Beğeni Bildirimleri</ElementsText>
                    <ElementsText style={styles.settingItemDescription}>
                      Birisi sizi beğendiğinde bildirim alın
                    </ElementsText>
                  </View>
                </View>
                <Switch
                  value={likeNotifications}
                  onValueChange={toggleLikeNotifications}
                  trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                  thumbColor={likeNotifications ? COLORS.dark.primary : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                />
              </View>
              
              {/* Sistem Bildirimleri */}
              <View style={styles.settingItem}>
                <View style={styles.settingItemLeft}>
                  <MaterialCommunityIcons 
                    name="information" 
                    size={24} 
                    color="#9C27B0" 
                  />
                  <View style={styles.settingItemTextContainer}>
                    <ElementsText style={styles.settingItemTitle}>Sistem Bildirimleri</ElementsText>
                    <ElementsText style={styles.settingItemDescription}>
                      Duyurular ve önemli güncellemeler için bildirim alın
                    </ElementsText>
                  </View>
                </View>
                <Switch
                  value={systemNotifications}
                  onValueChange={toggleSystemNotifications}
                  trackColor={{ false: '#3e3e3e', true: `${COLORS.dark.primary}50` }}
                  thumbColor={systemNotifications ? COLORS.dark.primary : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                />
              </View>
            </View>
            
            {/* Kaydet Butonu */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveNotificationSettings}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#9C27B0', '#673AB7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons 
                      name="content-save" 
                      size={20} 
                      color="#FFFFFF" 
                      style={styles.saveButtonIcon} 
                    />
                    <ElementsText style={styles.saveButtonText}>Ayarları Kaydet</ElementsText>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
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
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: SPACING.xs,
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.dark.textSecondary,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
    fontWeight: '500',
    color: COLORS.dark.text,
    marginBottom: 2,
  },
  settingItemDescription: {
    fontSize: 12,
    color: COLORS.dark.textSecondary,
  },
  saveButton: {
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.xxl,
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