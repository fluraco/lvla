import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../../contexts/NotificationContext';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../../contexts/UserContext';

// Arayüz
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  image_url?: string;
  sender_id?: string;
}

// Bileşen prop'ları
interface HomeTopBarProps {
  onFilterPress?: () => void;
  onViewModeToggle?: () => void;
  isListView?: boolean;
}

export function HomeTopBar({ onFilterPress, onViewModeToggle, isListView = false }: HomeTopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Bildirim context'ini kullan
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    fetchNotifications
  } = useNotifications();

  const navigation = useNavigation();
  const { user } = useUser();
  const isPremium = user?.is_premium || false;

  const handleNotifications = () => {
    // Açmadan önce bildirimleri yenile
    fetchNotifications();
    setShowNotifications(true);
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
  };

  const handleFilters = () => {
    // Filtreler sayfasına yönlendirme yapılacak
    console.log('Filters pressed');
    if (onFilterPress) {
      onFilterPress();
    }
  };

  const handlePremium = () => {
    // Premium sayfasına yönlendirme
    navigation.navigate('PremiumScreen' as never);
  };

  const handleViewModeToggle = () => {
    // Görünüm modunu değiştir
    console.log('Görünüm modu değiştiriliyor');
    if (onViewModeToggle) {
      onViewModeToggle();
    }
  };

  // Bildirimi okundu olarak işaretle
  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
  };

  // Bildirimi sil
  const handleDeleteNotification = (notificationId: string) => {
    deleteNotification(notificationId);
  };

  // Bildirimleri temizle - Şimdilik devre dışı
  const clearAllNotifications = () => {
    // Bildirimler silinemiyor, sadece okundu olarak işaretleniyor
    markAllAsRead();
  };

  // Tüm bildirimleri okundu olarak işaretle
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  // Zaman formatını düzenleme (bugün, dün, tarih)
  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
      // Aynı gün içinde
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `Bugün ${hours}:${minutes}`;
    } else if (diffDays === 1) {
      // Dün
      return 'Dün';
    } else {
      // Daha önceki tarihler
      return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
    }
  };

  // Bildirim ikonunu seç
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'match':
        return <MaterialCommunityIcons name="heart" size={22} color="#FF4B7E" />;
      case 'message':
        return <MaterialCommunityIcons name="chat" size={22} color="#4CCFF8" />;
      case 'like':
        return <MaterialCommunityIcons name="thumb-up" size={22} color="#FF4B7E" />;
      case 'superlike':
        return <MaterialCommunityIcons name="star" size={22} color="#4CCFF8" />;
      case 'announcement':
      case 'system':
      case 'promotion':
        return <MaterialCommunityIcons name="bell" size={22} color="#9C27B0" />;
      default:
        return <MaterialCommunityIcons name="bell" size={22} color="#9C27B0" />;
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[
        styles.notificationItem,
        !item.is_read && styles.unreadNotification
      ]}
      onPress={() => {
        // Bildirime tıklandığında yapılacak işlemler
        handleMarkAsRead(item.id);
        // Gerekirse ilgili ekrana yönlendirme yapılabilir
        console.log(`Notification clicked: ${item.id}`);
      }}
    >
      <View style={styles.notificationIconContainer}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.notificationImage} />
        ) : (
          <View style={styles.notificationDefaultIcon}>
            {getNotificationIcon(item.type)}
          </View>
        )}
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationTime}>{formatNotificationTime(item.created_at)}</Text>
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.notificationDeleteButton}
        onPress={() => handleDeleteNotification(item.id)}
      >
        <MaterialCommunityIcons name="close" size={16} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.container}>
        <View style={styles.leftContainer}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleNotifications}
          >
            <MaterialCommunityIcons
              name="bell-outline"
              size={22}
              color={COLORS.light.textSecondary}
            />
            {unreadCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleFilters}
          >
            <MaterialCommunityIcons
              name="tune"
              size={22}
              color={COLORS.light.textSecondary}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleViewModeToggle}
          >
            <MaterialCommunityIcons
              name={isListView ? "cards" : "view-grid"}
              size={22}
              color={COLORS.light.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {!isPremium && (
          <TouchableOpacity
            onPress={handlePremium}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#9C27B0', '#673AB7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumButton}
            >
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={18}
                color={COLORS.light.white}
              />
              <Text style={styles.premiumText}>Premium Ol</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Bildirimler Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        statusBarTranslucent
        onRequestClose={handleCloseNotifications}
      >
        <SafeAreaView style={styles.modalContainer}>
          <LinearGradient
            colors={['#121212', '#1A1A1A', '#232323']}
            style={[styles.modalContent, { paddingTop: insets.top }]}
          >
            {/* Başlık ve Kapatma Butonu */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <MaterialCommunityIcons name="bell-ring" size={24} color="#FF6B94" style={styles.modalTitleIcon} />
                <Text style={styles.modalTitle}>Bildirimler</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseNotifications}
              >
                <LinearGradient
                  colors={['#333333', '#222222']}
                  style={styles.closeButtonGradient}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Bildirim Ayarları */}
            <View style={styles.notificationActions}>
              <TouchableOpacity 
                style={[
                  styles.notificationActionButton,
                  unreadCount === 0 && styles.disabledActionButton
                ]}
                onPress={handleMarkAllAsRead}
                disabled={unreadCount === 0}
              >
                <LinearGradient
                  colors={unreadCount === 0 ? ['#444', '#333'] : ['#464673', '#373760']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <MaterialCommunityIcons 
                    name="check-all" 
                    size={16} 
                    color={unreadCount === 0 ? "#888" : "#FFFFFF"} 
                    style={styles.actionButtonIcon}
                  />
                  <Text style={[
                    styles.notificationActionText,
                    unreadCount === 0 && styles.disabledText
                  ]}>
                    Tümünü Okundu İşaretle
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.notificationActionButton,
                  notifications.length === 0 && styles.disabledActionButton
                ]}
                onPress={clearAllNotifications}
                disabled={notifications.length === 0}
              >
                <LinearGradient
                  colors={notifications.length === 0 ? ['#444', '#333'] : ['#6E4663', '#5D3A53']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <MaterialCommunityIcons 
                    name="broom" 
                    size={16} 
                    color={notifications.length === 0 ? "#888" : "#FFFFFF"} 
                    style={styles.actionButtonIcon}
                  />
                  <Text style={[
                    styles.notificationActionText,
                    notifications.length === 0 && styles.disabledText
                  ]}>
                    Tümünü Temizle
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Bildirim Listesi */}
            {notifications.length > 0 ? (
              <FlatList
                data={notifications}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[
                      styles.notificationItem,
                      !item.is_read && styles.unreadNotification
                    ]}
                    onPress={() => {
                      handleMarkAsRead(item.id);
                      console.log(`Notification clicked: ${item.id}`);
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={!item.is_read ? ['#1E2444', '#1A1F38'] : ['#232323', '#1E1E1E']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.notificationItemGradient}
                    >
                      <View style={styles.notificationIconContainer}>
                        {item.image_url ? (
                          <View style={styles.imageWrapper}>
                            <Image source={{ uri: item.image_url }} style={styles.notificationImage} />
                          </View>
                        ) : (
                          <LinearGradient
                            colors={getTypeColors(item.type)}
                            style={styles.notificationDefaultIcon}
                          >
                            {getNotificationIcon(item.type)}
                          </LinearGradient>
                        )}
                      </View>
                      
                      <View style={styles.notificationContent}>
                        <View style={styles.notificationHeader}>
                          <Text style={styles.notificationTitle}>{item.title}</Text>
                          <View style={styles.timeContainer}>
                            <MaterialCommunityIcons name="clock-outline" size={12} color="rgba(255,255,255,0.5)" />
                            <Text style={styles.notificationTime}>{formatNotificationTime(item.created_at)}</Text>
                          </View>
                        </View>
                        <Text style={styles.notificationMessage} numberOfLines={2}>
                          {item.message}
                        </Text>
                        
                        {!item.is_read && (
                          <View style={styles.unreadIndicator} />
                        )}
                      </View>
                      
                      <TouchableOpacity 
                        style={styles.notificationDeleteButton}
                        onPress={() => handleDeleteNotification(item.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MaterialCommunityIcons name="delete-outline" size={20} color="rgba(255,255,255,0.5)" />
                      </TouchableOpacity>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.notificationList}
              />
            ) : (
              <View style={styles.emptyNotifications}>
                <LinearGradient 
                  colors={['#333', '#222']}
                  style={styles.emptyNotificationIcon}
                >
                  <MaterialCommunityIcons 
                    name="bell-sleep" 
                    size={50} 
                    color="rgba(255,255,255,0.3)" 
                  />
                </LinearGradient>
                <Text style={styles.emptyNotificationsTitle}>
                  Bildirim Yok
                </Text>
                <Text style={styles.emptyNotificationsText}>
                  Şu anda hiç bildiriminiz bulunmuyor. Yeni eşleşmeler ve mesajlar geldiğinde burada görünecek.
                </Text>
              </View>
            )}
          </LinearGradient>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// Bildirim türüne göre renk belirle
const getTypeColors = (type: string): string[] => {
  switch (type) {
    case 'match':
      return ['#FF4B7E', '#FF6B94'];
    case 'message':
      return ['#4CCFF8', '#4CA6F8'];
    case 'like':
      return ['#FF4B7E', '#FF6B94'];
    case 'superlike':
      return ['#4CCFF8', '#4CA6F8'];
    case 'announcement':
    case 'system':
      return ['#9C27B0', '#673AB7'];
    case 'promotion':
      return ['#F3AC3D', '#E5852E'];
    default:
      return ['#6C63FF', '#837DFF'];
  }
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(240,242,245,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF4B7E',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    shadowColor: '#9C27B0',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    gap: SPACING.xs,
  },
  premiumText: {
    color: COLORS.light.white,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: SPACING.sm,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitleIcon: {
    marginRight: SPACING.sm,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  closeButton: {
    borderRadius: BORDER_RADIUS.circular,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.circular,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Notification Styles
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  notificationActionButton: {
    flex: 1,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  actionButtonIcon: {
    marginRight: 6,
  },
  disabledActionButton: {
    opacity: 0.6,
  },
  notificationActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  disabledText: {
    color: 'rgba(255,255,255,0.5)',
  },
  notificationList: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  notificationItem: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5.84,
    elevation: 5,
  },
  notificationItemGradient: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  unreadNotification: {
    transform: [{scale: 1.01}],
  },
  notificationIconContainer: {
    marginRight: SPACING.md,
  },
  imageWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 2,
  },
  notificationImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  notificationDefaultIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 2,
  },
  notificationContent: {
    flex: 1,
    position: 'relative',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  notificationTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginLeft: 4,
  },
  notificationMessage: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 8,
    right: -SPACING.sm - 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CCFF8',
  },
  notificationDeleteButton: {
    alignSelf: 'center',
    paddingLeft: SPACING.sm,
  },
  emptyNotifications: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyNotificationIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5.84,
    elevation: 5,
  },
  emptyNotificationsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: SPACING.sm,
  },
  emptyNotificationsText: {
    marginTop: SPACING.sm,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '80%',
  },
}); 