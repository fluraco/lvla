import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Kullanabileceğimiz yazı boyutu tipleri
export const FONT_SIZE_OPTIONS = {
  SMALL: "small",
  MEDIUM: "medium",
  LARGE: "large"
};

// Farklı yazı boyutları için ölçek değerleri
export const FONT_SIZE_SCALES = {
  [FONT_SIZE_OPTIONS.SMALL]: 0.9,
  [FONT_SIZE_OPTIONS.MEDIUM]: 1,
  [FONT_SIZE_OPTIONS.LARGE]: 1.2
};

// Context tipi tanımı
interface FontSizeContextType {
  fontSize: string;
  fontSizeScale: number; 
  setFontSize: (size: string) => void;
}

// Context oluşturma
const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

// AsyncStorage için anahtar
const FONT_SIZE_STORAGE_KEY = '@font_size_preference';

// Provider bileşeni
export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<string>(FONT_SIZE_OPTIONS.MEDIUM);
  const [fontSizeScale, setFontSizeScale] = useState<number>(FONT_SIZE_SCALES[FONT_SIZE_OPTIONS.MEDIUM]);

  // İlk yüklemede AsyncStorage'dan yazı boyutu tercihini al
  useEffect(() => {
    const loadFontSizePreference = async () => {
      try {
        const savedFontSize = await AsyncStorage.getItem(FONT_SIZE_STORAGE_KEY);
        if (savedFontSize) {
          // Kayıtlı bir değer varsa onu kullan
          const validSize = Object.values(FONT_SIZE_OPTIONS).includes(savedFontSize) 
            ? savedFontSize 
            : FONT_SIZE_OPTIONS.MEDIUM;
          
          setFontSizeState(validSize);
          setFontSizeScale(FONT_SIZE_SCALES[validSize]);
        }
      } catch (error) {
        console.error('Yazı boyutu tercihi yüklenirken hata oluştu:', error);
      }
    };

    loadFontSizePreference();
  }, []);

  // Yazı boyutu değişikliğini yönet
  const setFontSize = async (size: string) => {
    try {
      // Geçerli bir yazı boyutu mu kontrol et
      if (!Object.values(FONT_SIZE_OPTIONS).includes(size)) {
        return;
      }
      
      // AsyncStorage'a kaydet
      await AsyncStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
      
      // State'i güncelle
      setFontSizeState(size);
      setFontSizeScale(FONT_SIZE_SCALES[size]);
    } catch (error) {
      console.error('Yazı boyutu kaydedilirken hata oluştu:', error);
    }
  };

  return (
    <FontSizeContext.Provider
      value={{
        fontSize,
        fontSizeScale,
        setFontSize
      }}
    >
      {children}
    </FontSizeContext.Provider>
  );
}

// Custom hook for using the context
export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
} 