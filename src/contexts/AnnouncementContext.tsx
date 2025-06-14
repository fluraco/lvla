import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUnviewedAnnouncements, getActiveAnnouncements, markAnnouncementAsViewed, Announcement } from '../services/announcement';
import { useUser } from './UserContext';

// Context tipi
interface AnnouncementContextType {
  announcements: Announcement[];
  unviewedAnnouncements: Announcement[];
  loading: boolean;
  error: Error | null;
  fetchAnnouncements: () => Promise<void>;
  markAsViewed: (announcementId: string) => Promise<void>;
  showAnnouncementModal: boolean;
  setShowAnnouncementModal: (show: boolean) => void;
  currentAnnouncement: Announcement | null;
  setCurrentAnnouncement: (announcement: Announcement | null) => void;
}

// Context oluştur
const AnnouncementContext = createContext<AnnouncementContextType | undefined>(undefined);

// Provider bileşeni
export const AnnouncementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unviewedAnnouncements, setUnviewedAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState<boolean>(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);

  // Duyuruları getir
  const fetchAnnouncements = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Tüm aktif duyuruları getir
      const { announcements: activeAnnouncements, error: activeError } = await getActiveAnnouncements();
      
      if (activeError) throw activeError;
      
      setAnnouncements(activeAnnouncements);
      
      // Kullanıcının görmediği duyuruları getir
      const { announcements: unviewed, error: unviewedError } = await getUnviewedAnnouncements(user.id);
      
      if (unviewedError) throw unviewedError;
      
      setUnviewedAnnouncements(unviewed);
      
      // Eğer görüntülenmemiş duyuru varsa ve modal açık değilse
      // İlk görüntülenmemiş duyuruyu seç ve modalı göster
      if (unviewed.length > 0 && !showAnnouncementModal && !currentAnnouncement) {
        setCurrentAnnouncement(unviewed[0]);
        setShowAnnouncementModal(true);
      }
    } catch (err) {
      console.error('Duyurular yüklenirken hata oluştu:', err);
      setError(err instanceof Error ? err : new Error('Duyurular yüklenemedi'));
    } finally {
      setLoading(false);
    }
  };

  // Duyuruyu görüntülendi olarak işaretle
  const markAsViewed = async (announcementId: string) => {
    if (!user) return;
    
    try {
      const { success, error: markError } = await markAnnouncementAsViewed(user.id, announcementId);
      
      if (markError) throw markError;
      
      if (success) {
        // Görüntülenmemiş duyurular listesinden kaldır
        setUnviewedAnnouncements(prev => prev.filter(announcement => announcement.id !== announcementId));
      }
    } catch (err) {
      console.error('Duyuru görüntülendi olarak işaretlenirken hata oluştu:', err);
      setError(err instanceof Error ? err : new Error('Duyuru işaretlenemedi'));
    }
  };

  // Kullanıcı değiştiğinde duyuruları yeniden yükle
  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [user]);

  const contextValue: AnnouncementContextType = {
    announcements,
    unviewedAnnouncements,
    loading,
    error,
    fetchAnnouncements,
    markAsViewed,
    showAnnouncementModal,
    setShowAnnouncementModal,
    currentAnnouncement,
    setCurrentAnnouncement
  };

  return (
    <AnnouncementContext.Provider value={contextValue}>
      {children}
    </AnnouncementContext.Provider>
  );
};

// Hook
export const useAnnouncements = () => {
  const context = useContext(AnnouncementContext);
  if (context === undefined) {
    throw new Error('useAnnouncements hook must be used within an AnnouncementProvider');
  }
  return context;
}; 