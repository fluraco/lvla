import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Location {
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

// Kullanıcı gizlilik ayarları türü
export interface PrivacySettings {
  profile_visibility: 'everyone' | 'matches' | 'nobody';
  location_sharing: boolean;
  photo_sharing: boolean;
  read_receipts: boolean;
  last_seen: boolean;
  activity_status: boolean;
  online_status: boolean;
}

// Varsayılan gizlilik ayarları
export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profile_visibility: 'everyone',
  location_sharing: true,
  photo_sharing: true,
  read_receipts: true,
  last_seen: true,
  activity_status: true,
  online_status: true
};

interface User {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  gender?: string;
  biography?: string;
  birth_date?: string;
  profile_photo?: string;
  photos?: string[];
  location?: Location;
  hobbies?: string[];
  status?: 'active' | 'paused' | 'deleted';
  deleted_at?: string;
  privacy_settings?: PrivacySettings;
}

interface UserContextType {
  user: User | null;
  session: Session | null;
  setUser: (user: User | null) => Promise<void>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  refetchUserData: () => Promise<void>;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
}

const USER_STORAGE_KEY = '@user_data';
const SESSION_STORAGE_KEY = '@user_session';

const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      // AsyncStorage'dan kullanıcı bilgilerini yükle
      const savedUserData = await AsyncStorage.getItem(USER_STORAGE_KEY);

      if (savedUserData) {
        try {
          const parsedUser = JSON.parse(savedUserData);
          
          // Eğer privacy_settings yoksa varsayılan değerleri ekle
          if (!parsedUser.privacy_settings) {
            parsedUser.privacy_settings = DEFAULT_PRIVACY_SETTINGS;
          }
          
          setUser(parsedUser);
          console.log('Kullanıcı AsyncStorage\'dan yüklendi:', parsedUser.id);
        } catch (error) {
          console.error('Kaydedilmiş kullanıcı yükleme hatası:', error);
        }
      }
    } catch (error) {
      console.error('Kullanıcı yükleme hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetUser = async (newUser: User | null) => {
    try {
      if (newUser) {
        // Eğer privacy_settings yoksa varsayılan değerleri ekle
        if (!newUser.privacy_settings) {
          newUser.privacy_settings = DEFAULT_PRIVACY_SETTINGS;
        }
        
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
        console.log('Kullanıcı AsyncStorage\'a kaydedildi:', newUser.id);
      } else {
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
        console.log('Kullanıcı AsyncStorage\'dan silindi');
      }
      setUser(newUser);
    } catch (error) {
      console.error('Kullanıcı kaydetme hatası:', error);
    }
  };

  const updatePrivacySettings = async (settings: Partial<PrivacySettings>) => {
    if (!user) return;
    
    try {
      // Mevcut ayarları yeni ayarlarla birleştir
      const updatedSettings = {
        ...user.privacy_settings,
        ...settings
      };
      
      // Kullanıcı gizlilik ayarlarını veritabanında güncelle
      const { error } = await supabase
        .from('users')
        .update({ privacy_settings: updatedSettings })
        .eq('id', user.id);
      
      if (error) {
        console.error('Gizlilik ayarları güncellenirken hata oluştu:', error);
        throw error;
      }
      
      // Yerel kullanıcı verisini güncelle
      const updatedUser = {
        ...user,
        privacy_settings: updatedSettings
      };
      
      await handleSetUser(updatedUser);
      console.log('Gizlilik ayarları güncellendi');
    } catch (error) {
      console.error('Gizlilik ayarları güncellenirken hata oluştu:', error);
      throw error;
    }
  };

  const refetchUserData = async () => {
    try {
      if (!user?.id) return;
      console.log('Kullanıcı bilgileri yenileniyor, ID:', user.id);
      
      // Veritabanından güncel kullanıcı bilgilerini çek
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('Kullanıcı bilgileri alınamadı:', userError);
        return;
      }
      
      if (userData) {
        // Eğer privacy_settings veritabanında null ise varsayılan değerleri kullan
        if (!userData.privacy_settings) {
          userData.privacy_settings = DEFAULT_PRIVACY_SETTINGS;
        }
        
        // Güncel kullanıcı bilgilerini kaydet
        await handleSetUser(userData);
        console.log('Kullanıcı bilgileri güncellendi');
      }
    } catch (error) {
      console.error('Kullanıcı bilgileri yenilenirken hata oluştu:', error);
    }
  };

  const logout = async () => {
    try {
      // Sadece AsyncStorage'dan kullanıcı bilgilerini temizle
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      console.log('Kullanıcı çıkış yaptı');
    } catch (error) {
      console.error('Çıkış yapma hatası:', error);
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        session,
        setUser: handleSetUser,
        isLoading,
        setIsLoading,
        logout,
        refetchUserData,
        updatePrivacySettings,
      }}
    >
      {children}
    </UserContext.Provider>
  );
} 