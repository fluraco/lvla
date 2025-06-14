import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '../services/supabase';
import { initializeNotifications, setupNotificationListeners, registerForPushNotifications } from '../services/pushNotification';
import { getAllNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../services/notification';
import { useUser } from './UserContext';

// Bildirim nesnesi türü
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  image_url?: string;
  created_at: string;
  is_read: boolean;
  [key: string]: any; // Diğer olası alanlar
}

// Context tipi
interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  lastNotificationResponse: Notifications.NotificationResponse | null;
}

// Context oluştur
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider bileşeni
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastNotificationResponse, setLastNotificationResponse] = useState<Notifications.NotificationResponse | null>(null);

  // Bildirimleri getir
  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { notifications: notificationData, error: notificationError } = await getAllNotifications(user.id);
      
      if (notificationError) throw notificationError;
      
      setNotifications(notificationData);
      setUnreadCount(notificationData.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Bildirimler yüklenirken hata oluştu:', err);
      setError(err instanceof Error ? err : new Error('Bildirimler yüklenemedi'));
    } finally {
      setLoading(false);
    }
  };

  // Bildirimi okundu olarak işaretle
  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    
    try {
      const { success, error: markError } = await markNotificationAsRead(notificationId, user.id);
      
      if (markError) throw markError;
      
      if (success) {
        // Bildirimi güncelle
        setNotifications(prev => prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true } 
            : notification
        ));
        
        // Okunmamış sayısını güncelle
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Bildirim okundu olarak işaretlenirken hata oluştu:', err);
      setError(err instanceof Error ? err : new Error('Bildirim işaretlenemedi'));
    }
  };

  // Tüm bildirimleri okundu olarak işaretle
  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      const { success, error: markError } = await markAllNotificationsAsRead(user.id);
      
      if (markError) throw markError;
      
      if (success) {
        // Tüm bildirimleri güncelle
        setNotifications(prev => prev.map(notification => ({ ...notification, is_read: true })));
        
        // Okunmamış sayısını sıfırla
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Bildirimler okundu olarak işaretlenirken hata oluştu:', err);
      setError(err instanceof Error ? err : new Error('Bildirimler işaretlenemedi'));
    }
  };

  // Bildirimi sil
  const handleDeleteNotification = async (notificationId: string) => {
    if (!user) return;
    
    try {
      const { success, error: deleteError } = await deleteNotification(notificationId, user.id);
      
      if (deleteError) throw deleteError;
      
      if (success) {
        // Bildirim nesnesini bul
        const notification = notifications.find(n => n.id === notificationId);
        
        // Bildirimi listeden kaldır
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        // Eğer okunmamış bildirim silindiyse sayacı güncelle
        if (notification && !notification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error('Bildirim silinirken hata oluştu:', err);
      setError(err instanceof Error ? err : new Error('Bildirim silinemedi'));
    }
  };

  // Kullanıcı değiştiğinde bildirimleri yeniden yükle
  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Push bildirimleri başlat
      initializeNotifications(user.id);
      
      // Bildirim dinleyicilerini ayarla
      const cleanupListeners = setupNotificationListeners(
        (notification) => {
          // Yeni bildirim geldiğinde listeyiyi yeniden yükle
          fetchNotifications();
        },
        (response) => {
          // Bildirime tıklandığında
          setLastNotificationResponse(response);
          
          // Bildirimi otomatik olarak okundu işaretle
          const notificationId = response.notification.request.content.data?.id;
          if (notificationId && typeof notificationId === 'string') {
            markAsRead(notificationId);
          }
        }
      );
      
      // Gerçek-zamanlı bildirim değişiklikleri için Supabase dinleyicisi
      const notificationSubscription = supabase
        .channel('public:notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          // Yeni bildirim geldiğinde bildirimleri yenile
          fetchNotifications();
        })
        .subscribe();
      
      // Cleanup
      return () => {
        cleanupListeners();
        notificationSubscription.unsubscribe();
      };
    }
  }, [user]);

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification: handleDeleteNotification,
    lastNotificationResponse,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications hook must be used within a NotificationProvider');
  }
  return context;
}; 