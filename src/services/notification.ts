import { supabase } from './supabase';
import { sendPushNotification } from './pushNotification';
import { v4 as uuidv4 } from 'uuid';

// Bildirim tipleri
export type NotificationType = 'match' | 'message' | 'like' | 'superlike' | 'system' | 'announcement' | 'promotion';

// Bildirim arayüzü
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  image_url?: string;
  user_id?: string;
  sender_id?: string;
  related_entity_id?: string;
  related_entity_type?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

// Global bildirim arayüzü
export interface GlobalNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  image_url?: string;
  is_read: boolean;
  priority: number;
  deep_link?: string;
  created_at: string;
}

/**
 * Kullanıcıya özel bildirimleri getirir
 * @param userId Kullanıcı ID
 * @param limit Kaç bildirim getirileceği
 * @param offset Sayfalama için başlangıç indeksi
 * @param includeRead Okunmuş bildirimleri de dahil et
 * @returns Bildirimler listesi
 */
export const getUserNotifications = async (
  userId: string,
  limit: number = 50,
  offset: number = 0,
  includeRead: boolean = false
): Promise<{ notifications: Notification[], error?: Error }> => {
  try {
    if (!userId) {
      throw new Error('Kullanıcı ID gereklidir');
    }

    const { data, error } = await supabase
      .rpc('get_user_notifications', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset,
        p_include_read: includeRead
      });

    if (error) {
      throw error;
    }

    return {
      notifications: data as Notification[] || []
    };
  } catch (error) {
    console.error('Bildirimler getirilemedi:', error);
    return {
      notifications: [],
      error: error instanceof Error ? error : new Error('Bildirimler getirilemedi')
    };
  }
};

/**
 * Global bildirimleri getirir
 * @param userId Kullanıcı ID
 * @param limit Kaç bildirim getirileceği
 * @param offset Sayfalama için başlangıç indeksi
 * @returns Global bildirimler listesi
 */
export const getGlobalNotifications = async (
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ notifications: GlobalNotification[], error?: Error }> => {
  try {
    if (!userId) {
      throw new Error('Kullanıcı ID gereklidir');
    }

    const { data, error } = await supabase
      .rpc('get_global_notifications', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset
      });

    if (error) {
      throw error;
    }

    return {
      notifications: data as GlobalNotification[] || []
    };
  } catch (error) {
    console.error('Global bildirimler getirilemedi:', error);
    return {
      notifications: [],
      error: error instanceof Error ? error : new Error('Global bildirimler getirilemedi')
    };
  }
};

/**
 * Tüm bildirimleri getirir (kullanıcıya özel ve global)
 * @param userId Kullanıcı ID
 * @param limit Her bir tip için kaç bildirim getirileceği
 * @returns Tüm bildirimler
 */
export const getAllNotifications = async (
  userId: string,
  limit: number = 30
): Promise<{ notifications: (Notification | GlobalNotification)[], error?: Error }> => {
  try {
    if (!userId) {
      throw new Error('Kullanıcı ID gereklidir');
    }

    // Kullanıcı bildirimleri
    const userNotificationsPromise = getUserNotifications(userId, limit, 0, false);
    
    // Global bildirimler
    const globalNotificationsPromise = getGlobalNotifications(userId, limit, 0);

    const [userResult, globalResult] = await Promise.all([
      userNotificationsPromise,
      globalNotificationsPromise
    ]);

    if (userResult.error || globalResult.error) {
      throw userResult.error || globalResult.error;
    }

    // Bildirimleri birleştir ve tarihe göre sırala
    const combinedNotifications = [
      ...userResult.notifications,
      ...globalResult.notifications
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      notifications: combinedNotifications
    };
  } catch (error) {
    console.error('Bildirimler getirilemedi:', error);
    return {
      notifications: [],
      error: error instanceof Error ? error : new Error('Bildirimler getirilemedi')
    };
  }
};

/**
 * Bildirimi okundu olarak işaretler
 * @param notificationId Bildirim ID
 * @param userId Kullanıcı ID
 * @returns İşlem başarılı mı?
 */
export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
): Promise<{ success: boolean, error?: Error }> => {
  try {
    if (!notificationId || !userId) {
      throw new Error('Bildirim ID ve Kullanıcı ID gereklidir');
    }

    // Önce bildirimin türünü kontrol et (global mi yoksa kullanıcıya özel mi?)
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', notificationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (notificationError) {
      throw notificationError;
    }

    let result;

    // Eğer kullanıcıya özel bir bildirimse
    if (notification) {
      result = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', userId);
    } 
    // Global bildirimse
    else {
      // Önce global bildirim olup olmadığını kontrol et
      const { data: globalNotification, error: globalNotificationError } = await supabase
        .from('global_notifications')
        .select('id')
        .eq('id', notificationId)
        .maybeSingle();

      if (globalNotificationError) {
        throw globalNotificationError;
      }

      if (!globalNotification) {
        throw new Error('Bildirim bulunamadı');
      }

      // Kullanıcı için okuma kaydı var mı kontrol et
      const { data: readRecord, error: readRecordError } = await supabase
        .from('user_notification_reads')
        .select('id')
        .eq('global_notification_id', notificationId)
        .eq('user_id', userId)
        .maybeSingle();

      if (readRecordError) {
        throw readRecordError;
      }

      // Okuma kaydı varsa güncelle, yoksa yeni kayıt oluştur
      if (readRecord) {
        result = await supabase
          .from('user_notification_reads')
          .update({ 
            is_read: true,
            read_at: new Date().toISOString()
          })
          .eq('id', readRecord.id);
      } else {
        result = await supabase
          .from('user_notification_reads')
          .insert({
            user_id: userId,
            global_notification_id: notificationId,
            is_read: true,
            read_at: new Date().toISOString()
          });
      }
    }

    if (result.error) {
      throw result.error;
    }

    return { success: true };
  } catch (error) {
    console.error('Bildirim okundu olarak işaretlenemedi:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Bildirim okundu olarak işaretlenemedi')
    };
  }
};

/**
 * Tüm bildirimleri okundu olarak işaretler
 * @param userId Kullanıcı ID
 * @returns İşlem başarılı mı?
 */
export const markAllNotificationsAsRead = async (
  userId: string
): Promise<{ success: boolean, error?: Error }> => {
  try {
    if (!userId) {
      throw new Error('Kullanıcı ID gereklidir');
    }

    // Kullanıcıya özel bildirimleri güncelle
    const userNotificationsResult = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (userNotificationsResult.error) {
      throw userNotificationsResult.error;
    }

    // Global bildirimler için kullanıcının okuma kayıtlarını al
    const { data: globalNotifications, error: globalError } = await supabase
      .from('global_notifications')
      .select('id')
      .eq('active', true)
      .is('expires_at', null)
      .or('expires_at.gt.now');

    if (globalError) {
      throw globalError;
    }

    if (globalNotifications && globalNotifications.length > 0) {
      // Kullanıcının zaten okuma kaydı olan global bildirimleri al
      const { data: existingReads, error: existingReadsError } = await supabase
        .from('user_notification_reads')
        .select('global_notification_id')
        .eq('user_id', userId);

      if (existingReadsError) {
        throw existingReadsError;
      }

      // Okuma kaydı olmayan global bildirimler için yeni kayıtlar oluştur
      const existingReadIds = existingReads?.map(r => r.global_notification_id) || [];
      const notificationsToInsert = globalNotifications
        .filter(gn => !existingReadIds.includes(gn.id))
        .map(gn => ({
          user_id: userId,
          global_notification_id: gn.id,
          is_read: true,
          read_at: new Date().toISOString()
        }));

      // Yeni okuma kayıtları oluştur
      if (notificationsToInsert.length > 0) {
        const insertResult = await supabase
          .from('user_notification_reads')
          .insert(notificationsToInsert);

        if (insertResult.error) {
          throw insertResult.error;
        }
      }

      // Var olan okuma kayıtlarını güncelle
      if (existingReadIds.length > 0) {
        const updateResult = await supabase
          .from('user_notification_reads')
          .update({ 
            is_read: true,
            read_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('is_read', false)
          .in('global_notification_id', existingReadIds);

        if (updateResult.error) {
          throw updateResult.error;
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Tüm bildirimler okundu olarak işaretlenemedi:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Tüm bildirimler okundu olarak işaretlenemedi')
    };
  }
};

/**
 * Bildirimi siler
 * @param notificationId Bildirim ID
 * @param userId Kullanıcı ID
 * @returns İşlem başarılı mı?
 */
export const deleteNotification = async (
  notificationId: string,
  userId: string
): Promise<{ success: boolean, error?: Error }> => {
  try {
    if (!notificationId || !userId) {
      throw new Error('Bildirim ID ve Kullanıcı ID gereklidir');
    }

    // Önce bildirimin türünü kontrol et (global mi yoksa kullanıcıya özel mi?)
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', notificationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (notificationError) {
      throw notificationError;
    }

    let result;

    // Eğer kullanıcıya özel bir bildirimse
    if (notification) {
      result = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);
    } 
    // Global bildirimse - aslında silinmez, sadece okundu olarak işaretlenir
    else {
      // Kullanıcı için okuma kaydı oluştur veya güncelle
      result = await markNotificationAsRead(notificationId, userId);
    }

    if (result.error) {
      throw result.error;
    }

    return { success: true };
  } catch (error) {
    console.error('Bildirim silinemedi:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Bildirim silinemedi')
    };
  }
};

/**
 * Yeni mesaj bildirimi gönderir
 * @param receiverId Alıcı ID
 * @param senderId Gönderen ID
 * @param senderName Gönderen adı
 * @param messageContent Mesaj içeriği
 * @param conversationId Konuşma ID
 * @returns Bildirim nesnesi
 */
export const sendMessageNotification = async (
  receiverId: string,
  senderId: string,
  senderName: string,
  messageContent: string,
  conversationId: string
): Promise<{ success: boolean, notification?: Notification }> => {
  try {
    console.log(`Mesaj bildirimi gönderiliyor - Alıcı: ${receiverId}, Gönderen: ${senderId}`);
    
    if (!receiverId || !senderId) {
      throw new Error('Alıcı ID ve gönderen ID gereklidir');
    }
    
    // Alıcı ve gönderen aynı kişi ise bildirim gönderme
    if (receiverId === senderId) {
      console.log('Alıcı ve gönderen aynı kişi, bildirim gönderilmiyor');
      return { success: false };
    }
    
    // Mesaj içeriğini kısalt (resim, ses gibi özel içerikler için)
    let displayContent = messageContent;
    if (messageContent.startsWith('image:')) {
      displayContent = 'Size bir fotoğraf gönderdi';
    } else if (messageContent.startsWith('audio:')) {
      displayContent = 'Size bir sesli mesaj gönderdi';
    } else if (messageContent.startsWith('gift:')) {
      displayContent = 'Size bir hediye gönderdi';
    } else if (messageContent.length > 50) {
      displayContent = messageContent.substring(0, 47) + '...';
    }
    
    // Bildirim oluştur
    const notificationData = {
      id: uuidv4(),
      user_id: receiverId,
      sender_id: senderId,
      title: `Yeni Mesaj: ${senderName}`,
      message: displayContent,
      type: 'message' as NotificationType,
      related_entity_id: conversationId,
      related_entity_type: 'conversation',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Bildirim veritabanına kaydediliyor...');
    
    // Veritabanına kaydet
    const { error } = await supabase
      .from('notifications')
      .insert(notificationData);
    
    if (error) {
      console.error('Bildirim veritabanına kaydedilemedi:', error);
      throw error;
    }
    
    console.log('Bildirim veritabanına kaydedildi, push bildirimi gönderiliyor...');
    
    // Push bildirim gönder
    await sendPushNotification(receiverId, notificationData);
    
    console.log('Mesaj bildirimi başarıyla tamamlandı');
    return { success: true, notification: notificationData };
  } catch (error) {
    console.error('Mesaj bildirimi gönderme hatası:', error);
    if (error instanceof Error) {
      console.error('Hata detayı:', error.message);
      console.error('Hata stack:', error.stack);
    }
    return { success: false };
  }
};

/**
 * Eşleşme bildirimi gönderir
 * @param userId Kullanıcı ID
 * @param matchedUserId Eşleşilen kullanıcı ID
 * @param matchedUserName Eşleşilen kullanıcı adı
 * @param matchId Eşleşme ID
 * @returns Bildirim nesnesi
 */
export const sendMatchNotification = async (
  userId: string,
  matchedUserId: string,
  matchedUserName: string,
  matchId: string
): Promise<{ success: boolean, notification?: Notification }> => {
  try {
    if (!userId || !matchedUserId) {
      throw new Error('Kullanıcı ID ve eşleşilen kullanıcı ID gereklidir');
    }
    
    // Bildirim oluştur
    const notificationData = {
      id: uuidv4(),
      user_id: userId,
      sender_id: matchedUserId,
      title: 'Yeni Eşleşme!',
      message: `${matchedUserName} ile eşleştin! Şimdi mesajlaşmaya başlayabilirsin.`,
      type: 'match' as NotificationType,
      related_entity_id: matchId,
      related_entity_type: 'match',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Veritabanına kaydet
    const { error } = await supabase
      .from('notifications')
      .insert(notificationData);
    
    if (error) {
      throw error;
    }
    
    // Push bildirim gönder
    await sendPushNotification(userId, notificationData);
    
    return { success: true, notification: notificationData };
  } catch (error) {
    console.error('Eşleşme bildirimi gönderme hatası:', error);
    return { success: false };
  }
};

/**
 * Beğeni bildirimi gönderir
 * @param receiverId Alıcı ID
 * @param senderId Gönderen ID
 * @param senderName Gönderen adı
 * @param interactionType Etkileşim türü ('like' veya 'superlike')
 * @returns Bildirim nesnesi
 */
export const sendLikeNotification = async (
  receiverId: string,
  senderId: string,
  senderName: string,
  interactionType: 'like' | 'superlike' = 'like'
): Promise<{ success: boolean, notification?: Notification }> => {
  try {
    if (!receiverId || !senderId) {
      throw new Error('Alıcı ID ve gönderen ID gereklidir');
    }
    
    // Bildirim oluştur
    const notificationData = {
      id: uuidv4(),
      user_id: receiverId,
      sender_id: senderId,
      title: interactionType === 'like' ? 'Yeni Beğeni!' : 'Süper Beğeni!',
      message: interactionType === 'like' 
        ? `${senderName} seni beğendi!` 
        : `${senderName} seni süper beğendi!`,
      type: interactionType as NotificationType,
      related_entity_id: senderId,
      related_entity_type: 'user',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Veritabanına kaydet
    const { error } = await supabase
      .from('notifications')
      .insert(notificationData);
    
    if (error) {
      throw error;
    }
    
    // Push bildirim gönder
    await sendPushNotification(receiverId, notificationData);
    
    return { success: true, notification: notificationData };
  } catch (error) {
    console.error('Beğeni bildirimi gönderme hatası:', error);
    return { success: false };
  }
};

/**
 * Hediye bildirimi gönderir
 * @param receiverId Alıcı ID
 * @param senderId Gönderen ID
 * @param senderName Gönderen adı
 * @param giftName Hediye adı
 * @param conversationId Konuşma ID
 * @returns Bildirim nesnesi
 */
export const sendGiftNotification = async (
  receiverId: string,
  senderId: string,
  senderName: string,
  giftName: string,
  conversationId: string
): Promise<{ success: boolean, notification?: Notification }> => {
  try {
    if (!receiverId || !senderId) {
      throw new Error('Alıcı ID ve gönderen ID gereklidir');
    }
    
    // Bildirim oluştur
    const notificationData = {
      id: uuidv4(),
      user_id: receiverId,
      sender_id: senderId,
      title: 'Yeni Hediye!',
      message: `${senderName} size ${giftName} hediye etti!`,
      type: 'system' as NotificationType,
      related_entity_id: conversationId,
      related_entity_type: 'conversation',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Veritabanına kaydet
    const { error } = await supabase
      .from('notifications')
      .insert(notificationData);
    
    if (error) {
      throw error;
    }
    
    // Push bildirim gönder
    await sendPushNotification(receiverId, notificationData);
    
    return { success: true, notification: notificationData };
  } catch (error) {
    console.error('Hediye bildirimi gönderme hatası:', error);
    return { success: false };
  }
}; 