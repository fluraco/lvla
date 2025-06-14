import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Notification, NotificationType } from './notification';

// Proje ID'sini al - EAS yapılandırması için
const getProjectId = () => {
  try {
    return Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  } catch (e) {
    console.error('Proje ID alınamadı:', e);
    return null;
  }
};

// Bildirim içeriği arayüzü
interface PushNotificationContent {
  title: string;
  body: string; 
  data?: Record<string, unknown>;
}

/**
 * Bildirimlerin nasıl görüntüleneceğini ayarla
 */
export const configurePushNotifications = () => {
  try {
    console.log('Push bildirimleri yapılandırılıyor');
    
    Notifications.setNotificationHandler({
      handleNotification: async () => {
        console.log('Bildirim alındı, işleniyor');
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true, // iOS 14+ için banner bildirimleri
          shouldShowList: true, // iOS 14+ için bildirim listesi görünümü
        };
      },
      handleSuccess: (notificationId) => {
        console.log('Bildirim başarıyla gösterildi:', notificationId);
      },
      handleError: (error) => {
        console.error('Bildirim gösterilirken hata oluştu:', error);
      }
    });
    
    console.log('Push bildirimleri başarıyla yapılandırıldı');
  } catch (error) {
    console.error('Push bildirimleri yapılandırılırken hata oluştu:', error);
  }
};

/**
 * Android için kanal oluştur
 */
export const createNotificationChannels = async () => {
  if (Platform.OS === 'android') {
    // Ana kanal
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Varsayılan',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF4B7E',
      sound: true,
    });

    // Eşleşme bildirimleri
    await Notifications.setNotificationChannelAsync('match', {
      name: 'Eşleşmeler',
      description: 'Yeni eşleşme bildirimleri',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF4B7E',
      sound: true,
    });

    // Mesaj bildirimleri
    await Notifications.setNotificationChannelAsync('message', {
      name: 'Mesajlar',
      description: 'Yeni mesaj bildirimleri',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CCFF8',
      sound: true,
    });

    // Beğeni bildirimleri
    await Notifications.setNotificationChannelAsync('like', {
      name: 'Beğeniler',
      description: 'Profil beğeni bildirimleri',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF4B7E',
      sound: true,
    });

    // Süper beğeni bildirimleri
    await Notifications.setNotificationChannelAsync('superlike', {
      name: 'Süper Beğeniler',
      description: 'Süper beğeni bildirimleri',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CCFF8',
      sound: true,
    });

    // Duyurular
    await Notifications.setNotificationChannelAsync('announcement', {
      name: 'Duyurular',
      description: 'Sistem duyuruları',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#9C27B0',
      sound: true,
    });
  }
};

/**
 * Push bildirimler için gerekli izinleri iste
 * @returns İzin durumu
 */
export const requestNotificationsPermissions = async (): Promise<boolean> => {
  if (!Device.isDevice) {
    console.warn('Push bildirimler için fiziksel cihaz gereklidir');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push bildirimleri için izin alınamadı');
    return false;
  }

  return true;
};

/**
 * Kullanıcı için push token al ve kaydet
 * @param userId Kullanıcı ID
 * @returns Push token
 */
export const registerForPushNotifications = async (userId: string): Promise<string | null> => {
  try {
    const hasPermission = await requestNotificationsPermissions();
    if (!hasPermission) return null;

    const projectId = getProjectId();
    if (!projectId) {
      console.error('EAS Project ID bulunamadı');
      return null;
    }

    // Expo Push Token al
    const { data: tokenData } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    // Cihaz bilgilerini al
    const deviceType = Platform.OS;
    const deviceId = Device.modelId || Device.deviceName || undefined;

    // Token'ı veritabanına kaydet
    if (tokenData) {
      const { error } = await supabase.rpc('save_push_token', {
        p_user_id: userId,
        p_token: tokenData,
        p_device_id: deviceId,
        p_device_type: deviceType,
      });

      if (error) throw error;
      
      return tokenData;
    }

    return null;
  } catch (error) {
    console.error('Push token kaydedilemedi:', error);
    return null;
  }
};

/**
 * Yerel bildirim gönder (test için)
 * @param content Bildirim içeriği
 */
export const sendLocalNotification = async (content: PushNotificationContent): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data: content.data || {},
    },
    trigger: null, // Hemen gönder
  });
};

/**
 * Bildirim tipine göre Android kanalını belirle
 * @param type Bildirim tipi
 * @returns Kanal ID
 */
const getChannelForNotificationType = (type: NotificationType): string => {
  switch (type) {
    case 'match':
      return 'match';
    case 'message':
      return 'message';
    case 'like':
      return 'like';
    case 'superlike':
      return 'superlike';
    case 'announcement':
    case 'system':
    case 'promotion':
    default:
      return 'default';
  }
};

/**
 * Kullanıcıya push bildirim gönder
 * @param userId Kullanıcı ID
 * @param notification Bildirim nesnesi
 */
export const sendPushNotification = async (userId: string, notification: Notification): Promise<void> => {
  try {
    console.log(`Push bildirim gönderiliyor - Kullanıcı: ${userId}, Bildirim Tipi: ${notification.type}`);
    
    // Kullanıcının push tokenlarını getir
    const { data: pushTokens, error } = await supabase
      .rpc('get_user_push_tokens', {
        p_user_id: userId
      });

    if (error) {
      console.error('Token alınamadı:', error);
      throw error;
    }
    
    if (!pushTokens || pushTokens.length === 0) {
      console.log(`Kullanıcı için kayıtlı push token bulunamadı: ${userId}`);
      return;
    }

    console.log(`${pushTokens.length} adet token bulundu.`);

    // Kullanıcının bildirim ayarlarını kontrol et
    const { data: settings, error: settingsError } = await supabase
      .from('user_notification_settings')
      .select('push_enabled, match_notifications, message_notifications, like_notifications, system_notifications')
      .eq('user_id', userId)
      .single();
    
    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Bildirim ayarları kontrol edilemedi:', settingsError);
      // Default olarak bildirimlerin açık olduğunu varsay
    } else if (settings) {
      // Kullanıcı push bildirimleri kapatmışsa gönderme
      if (!settings.push_enabled) {
        console.log(`Kullanıcı push bildirimleri kapatmış: ${userId}`);
        return;
      }
      
      // Bildirim tipine göre kullanıcının o tür bildirimleri kapatıp kapatmadığını kontrol et
      if (notification.type === 'match' && !settings.match_notifications) {
        console.log(`Kullanıcı eşleşme bildirimlerini kapatmış: ${userId}`);
        return;
      } else if (notification.type === 'message' && !settings.message_notifications) {
        console.log(`Kullanıcı mesaj bildirimlerini kapatmış: ${userId}`);
        return;
      } else if ((notification.type === 'like' || notification.type === 'superlike') && !settings.like_notifications) {
        console.log(`Kullanıcı beğeni bildirimlerini kapatmış: ${userId}`);
        return;
      } else if ((notification.type === 'system' || notification.type === 'announcement' || notification.type === 'promotion') && !settings.system_notifications) {
        console.log(`Kullanıcı sistem bildirimlerini kapatmış: ${userId}`);
        return;
      }
    }

    // Her bir token için bildirim gönder
    const messages = pushTokens.map(tokenData => ({
      to: tokenData.token,
      sound: 'default',
      title: notification.title,
      body: notification.message,
      data: {
        id: notification.id,
        type: notification.type,
        relatedEntityId: notification.related_entity_id || null,
        relatedEntityType: notification.related_entity_type || null,
        timestamp: new Date().toISOString(),
      },
      channelId: getChannelForNotificationType(notification.type),
      badge: 1,
      priority: 'high',
    }));

    console.log(`${messages.length} bildirim mesajı hazırlandı.`);

    // Expo Push API ile bildirimleri gönder
    const chunks = messages.length > 100 ? chunkArray(messages, 100) : [messages];
    
    for (const chunk of chunks) {
      try {
        console.log(`${chunk.length} adet bildirim gönderiliyor...`);
        
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });
        
        if (!response.ok) {
          const responseText = await response.text();
          console.error('Push bildirim gönderme hatası:', responseText);
          console.error('Yanıt kodu:', response.status, response.statusText);
          throw new Error(`Push bildirim yanıtı hatalı: ${response.status} ${responseText}`);
        } else {
          const responseData = await response.json();
          console.log('Bildirim başarıyla gönderildi:', responseData);
        }
      } catch (error) {
        console.error('Push API çağrısı sırasında hata:', error);
        if (error instanceof Error) {
          console.error('Hata detayı:', error.message);
          console.error('Hata stack:', error.stack);
        }
      }
    }
  } catch (error) {
    console.error('Push bildirim gönderilemedi:', error);
    if (error instanceof Error) {
      console.error('Hata detayı:', error.message);
      console.error('Hata stack:', error.stack);
    }
  }
};

/**
 * Büyük diziyi küçük parçalara böl
 * @param array Bölünecek dizi
 * @param size Parça boyutu
 * @returns Parçalara bölünmüş dizi
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Bildirim dinleyicilerini başlat
 * @param onNotification Bildirim alındığında çalışacak callback
 * @param onNotificationResponse Bildirime tıklandığında çalışacak callback
 * @returns Dinleyicileri temizleme fonksiyonu
 */
export const setupNotificationListeners = (
  onNotification?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) => {
  // Bildirim alındığında
  const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Bildirim alındı:', notification);
    if (onNotification) onNotification(notification);
  });

  // Bildirime tıklandığında
  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Bildirime tıklandı:', response);
    if (onNotificationResponse) onNotificationResponse(response);
  });

  // Cleanup fonksiyonu
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
};

/**
 * Push bildirim ayarlarını sıfırla ve token'ı sil
 * @param userId Kullanıcı ID
 */
export const unregisterPushNotifications = async (userId: string): Promise<void> => {
  try {
    // Token'ları veritabanından sil
    await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId);

    // Expo bildirim kaydını iptal et
    await Notifications.unregisterForNotificationsAsync();
  } catch (error) {
    console.error('Push bildirim kaydı iptal edilemedi:', error);
  }
};

/**
 * Uygulama başladığında çağrılacak bildirim ayarlama fonksiyonu
 */
export const initializeNotifications = async (userId: string): Promise<void> => {
  try {
    // Bildirimlerin nasıl gösterileceğini ayarla
    configurePushNotifications();
    
    // Android için bildirimi kanallarını oluştur
    await createNotificationChannels();
    
    // Push bildirimler için token al ve kaydet
    if (userId) {
      await registerForPushNotifications(userId);
    }
  } catch (error) {
    console.error('Bildirim sistemi başlatılamadı:', error);
  }
}; 