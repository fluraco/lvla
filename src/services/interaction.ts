import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendMatchNotification, sendLikeNotification } from './notification';
import { v4 as uuidv4 } from 'uuid';

export type InteractionType = 'like' | 'dislike' | 'superlike';

/**
 * Kullanıcı etkileşimini user_interactions tablosuna kaydeder.
 * @param userId Mevcut oturum açmış kullanıcının ID'si
 * @param targetUserId Etkileşime girilen hedef kullanıcının ID'si
 * @param interactionType Etkileşim tipi: 'like', 'dislike' veya 'superlike'
 * @returns Promise<{success: boolean, error?: Error}> 
 */
export const saveUserInteraction = async (
  userId: string, 
  targetUserId: string, 
  interactionType: InteractionType
): Promise<{success: boolean, error?: Error}> => {
  try {
    if (!userId || !targetUserId) {
      console.error('Kullanıcı ID veya hedef kullanıcı ID eksik');
      return { success: false, error: new Error('Kullanıcı ID veya hedef kullanıcı ID eksik') };
    }

    console.log(`Etkileşim kaydediliyor: ${userId} -> ${targetUserId}, Tip: ${interactionType}`);
    
    // Mevcut bir etkileşim var mı kontrol et
    const { data: existingInteraction, error: checkError } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', userId)
      .eq('target_user_id', targetUserId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Mevcut etkileşim kontrolü hatası:', checkError);
      // Hata olsa bile devam et
    }
    
    let result;
    
    // Eğer etkileşim varsa, güncelle
    if (existingInteraction) {
      console.log(`Mevcut etkileşim güncelleniyor: ${existingInteraction.interaction_type} -> ${interactionType}`);
      
      result = await supabase
        .from('user_interactions')
        .update({ interaction_type: interactionType })
        .eq('user_id', userId)
        .eq('target_user_id', targetUserId);
    } 
    // Yoksa yeni bir etkileşim ekle
    else {
      console.log('Yeni etkileşim ekleniyor');
      
      result = await supabase
        .from('user_interactions')
        .insert({
          user_id: userId,
          target_user_id: targetUserId,
          interaction_type: interactionType
        });
    }
    
    const { error } = result;
    
    if (error) {
      console.error('Etkileşim kaydetme hatası:', error);
      
      // RLS hatası alınırsa veya başka bir hata oluşursa
      // AsyncStorage'a geçici olarak kaydet
      const key = `@interaction_${userId}_${targetUserId}`;
      const storageData = {
        userId,
        targetUserId,
        interactionType,
        timestamp: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(key, JSON.stringify(storageData));
      console.log('Etkileşim bilgileri geçici olarak AsyncStorage\'a kaydedildi');
      
      // Hata olsa bile UI deneyimini bozmamak için başarılı dönüyoruz
      return { success: true, error };
    }
    
    // Beğeni veya süper beğeni durumunda karşı tarafa bildirim gönder
    if (interactionType === 'like' || interactionType === 'superlike') {
      try {
        // Kullanıcı bilgilerini al
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();
          
        if (userError) throw userError;
        
        const senderName = userData.first_name + (userData.last_name ? ' ' + userData.last_name : '');
        
        // Premium olmayan kullanıcılar beğenileri göremez, sadece süper beğeniler için bildirim gönder
        if (interactionType === 'superlike') {
          // Süper beğeni bildirimi gönder
          await sendLikeNotification(targetUserId, userId, senderName, 'superlike');
        } else {
          // Hedef kullanıcının premium olup olmadığını kontrol et
          const { data: targetUserData, error: targetUserError } = await supabase
            .from('users')
            .select('is_premium')
            .eq('id', targetUserId)
            .single();
            
          if (!targetUserError && targetUserData && targetUserData.is_premium) {
            // Sadece premium kullanıcılara normal beğeni bildirimi gönder
            await sendLikeNotification(targetUserId, userId, senderName, 'like');
          }
        }
      } catch (notifError) {
        console.error('Beğeni bildirimi gönderme hatası:', notifError);
        // Bildirim hatası akışı etkilemesin
      }
    }
    
    console.log(`${interactionType} etkileşimi başarıyla kaydedildi`);
    return { success: true };
  } catch (error) {
    console.error('Etkileşim kaydetme hatası:', error);
    // Hata ne olursa olsun, kullanıcı deneyimini bozmamak için başarılı döndürelim
    return { success: true, error: error as Error };
  }
};

/**
 * Kullanıcı etkileşimlerini kontrol eder ve eşleşme olup olmadığını belirler.
 * @param userId Mevcut kullanıcının ID'si
 * @param targetUserId Hedef kullanıcının ID'si
 * @returns Promise<{isMatch: boolean, matchId?: string, error?: Error}>
 */
export const checkForMatch = async (
  userId: string,
  targetUserId: string
): Promise<{isMatch: boolean, matchId?: string, error?: Error}> => {
  try {
    // userId parametresi zaten mevcut, oturum kontrolü yapmaya gerek yok
    if (!userId || !targetUserId) {
      console.error('Kullanıcı ID veya hedef kullanıcı ID eksik');
      return { isMatch: false, error: new Error('Kullanıcı ID veya hedef kullanıcı ID eksik') };
    }
    
    console.log(`Eşleşme kontrol ediliyor: ${userId} ve ${targetUserId} arasında`);
    
    // Karşı tarafın da like/superlike etkileşimi olup olmadığını kontrol et
    const { data, error } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('target_user_id', userId)
      .in('interaction_type', ['like', 'superlike'])
      .maybeSingle(); // single() yerine maybeSingle() kullanarak PGRST116 hatasını önle

    if (error) {
      throw error;
    }

    // Eğer veri varsa, bir eşleşme var demektir
    const isMatch = !!data;
    
    if (isMatch) {
      console.log(`Eşleşme bulundu: ${userId} ve ${targetUserId} arasında`);
      
      // Eşleşme kaydı oluştur veya güncelle
      let matchId: string;
      
      // Önce mevcut bir eşleşme var mı kontrol et
      const { data: existingMatch, error: matchCheckError } = await supabase
        .from('user_matches')
        .select('id')
        .or(`user_id1.eq.${userId},user_id2.eq.${userId}`)
        .or(`user_id1.eq.${targetUserId},user_id2.eq.${targetUserId}`)
        .maybeSingle();
        
      if (matchCheckError) {
        console.error('Eşleşme kontrol hatası:', matchCheckError);
      }
      
      // Mevcut eşleşme varsa güncelle, yoksa yeni oluştur
      if (existingMatch) {
        matchId = existingMatch.id;
        
        // Eşleşmeyi aktif olarak güncelle
        await supabase
          .from('user_matches')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', matchId);
      } else {
        // Yeni eşleşme oluştur
        matchId = uuidv4();
        
        await supabase
          .from('user_matches')
          .insert({
            id: matchId,
            user_id1: userId,
            user_id2: targetUserId,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
      
      try {
        // Kullanıcı bilgilerini al
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', targetUserId)
          .single();
          
        if (userError) throw userError;
        
        const { data: currentUserData, error: currentUserError } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();
          
        if (currentUserError) throw currentUserError;
        
        const targetUserName = userData.first_name + (userData.last_name ? ' ' + userData.last_name : '');
        const currentUserName = currentUserData.first_name + (currentUserData.last_name ? ' ' + currentUserData.last_name : '');
        
        // Her iki kullanıcıya da eşleşme bildirimi gönder
        await sendMatchNotification(userId, targetUserId, targetUserName, matchId);
        await sendMatchNotification(targetUserId, userId, currentUserName, matchId);
      } catch (notifError) {
        console.error('Eşleşme bildirimi gönderme hatası:', notifError);
        // Bildirim hatası akışı etkilemesin
      }
      
      return { isMatch, matchId };
    }

    return { isMatch };
  } catch (error) {
    console.error('Eşleşme kontrolü hatası:', error);
    return { isMatch: false, error: error as Error };
  }
}; 