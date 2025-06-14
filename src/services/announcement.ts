import { supabase } from './supabase';

// Duyuru arayüzü
export interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  start_date: string;
  end_date: string | null;
  link_url?: string;
  link_type?: string;
  updated_at: string;
  created_by?: string;
}

/**
 * Aktif duyuruları getirir
 * @returns Aktif duyurular listesi
 */
export const getActiveAnnouncements = async (): Promise<{ announcements: Announcement[], error?: Error }> => {
  try {
    // Şu anki tarihi al
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', now)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return {
      announcements: data as Announcement[] || []
    };
  } catch (error) {
    console.error('Duyurular getirilemedi:', error);
    return {
      announcements: [],
      error: error instanceof Error ? error : new Error('Duyurular getirilemedi')
    };
  }
};

/**
 * Belirli bir duyuruyu getirir
 * @param announcementId Duyuru ID
 * @returns Duyuru nesnesi
 */
export const getAnnouncementById = async (announcementId: string): Promise<{ announcement: Announcement | null, error?: Error }> => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', announcementId)
      .single();

    if (error) {
      throw error;
    }

    return {
      announcement: data as Announcement
    };
  } catch (error) {
    console.error('Duyuru getirilemedi:', error);
    return {
      announcement: null,
      error: error instanceof Error ? error : new Error('Duyuru getirilemedi')
    };
  }
};

/**
 * Kullanıcının görüntülediği duyuruları kaydet
 * @param userId Kullanıcı ID
 * @param announcementId Duyuru ID
 */
export const markAnnouncementAsViewed = async (userId: string, announcementId: string): Promise<{ success: boolean, error?: Error }> => {
  try {
    // Kullanıcı daha önce bu duyuruyu görüntülemiş mi kontrol et
    const { data: existingView, error: checkError } = await supabase
      .from('user_announcement_views')
      .select('id')
      .eq('user_id', userId)
      .eq('announcement_id', announcementId)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    // Eğer daha önce görüntülenmemişse kaydet
    if (!existingView) {
      const { error: insertError } = await supabase
        .from('user_announcement_views')
        .insert({
          user_id: userId,
          announcement_id: announcementId,
          viewed_at: new Date().toISOString()
        });

      if (insertError) {
        throw insertError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Duyuru görüntülenme kaydı yapılamadı:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Duyuru görüntülenme kaydı yapılamadı')
    };
  }
};

/**
 * Kullanıcının görüntülemediği aktif duyuruları getirir
 * @param userId Kullanıcı ID
 * @returns Kullanıcının henüz görmediği aktif duyurular
 */
export const getUnviewedAnnouncements = async (userId: string): Promise<{ announcements: Announcement[], error?: Error }> => {
  try {
    const { data, error } = await supabase
      .rpc('get_unviewed_announcements', {
        p_user_id: userId
      });

    if (error) {
      throw error;
    }

    return {
      announcements: data as Announcement[] || []
    };
  } catch (error) {
    console.error('Görüntülenmemiş duyurular getirilemedi:', error);
    return {
      announcements: [],
      error: error instanceof Error ? error : new Error('Görüntülenmemiş duyurular getirilemedi')
    };
  }
}; 