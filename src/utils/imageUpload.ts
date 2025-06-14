import { supabase, checkSupabaseConnection } from '../services/supabase';
import { decode } from 'base64-arraybuffer';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export async function uploadImageAsync(uri: string, fileName: string, bucket: string) {
  try {
    // Gerçek bir bağlantı kontrolü yapalım
    try {
      // İnternet bağlantısını kontrol et - timeout ekleyelim
      const netInfoPromise = NetInfo.fetch();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Ağ kontrolü zaman aşımına uğradı')), 5000)
      );
      
      const netInfo = await Promise.race([netInfoPromise, timeoutPromise]) as NetInfo.NetInfoState;
      
      if (!netInfo.isConnected) {
        throw new Error('İnternet bağlantısı bulunamadı. Lütfen bağlantınızı kontrol edin.');
      }
    } catch (netError) {
      console.error('Ağ kontrol hatası:', netError);
      throw new Error('İnternet bağlantısı kontrol edilirken hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
    
    // URI formatını kontrol et
    if (!uri || typeof uri !== 'string') {
      throw new Error('Geçersiz resim formatı.');
    }

    // Dosya uzantısını kontrol et - platform bazlı düzeltme
    const isPlatformFile = uri.startsWith('file://');
    let fileExtension = uri.split('.').pop()?.toLowerCase();
    
    // iOS ile çalışırken bazen uzantı gelmeyebilir
    if (!fileExtension && Platform.OS === 'ios') {
      // Resim varsa .jpg kabul edelim
      fileExtension = 'jpg';
    }
    
    const isValidExtension = ['jpg', 'jpeg', 'png', 'heic', 'heif'].includes(fileExtension || '');
    
    if (!isValidExtension && !isPlatformFile) {
      console.warn(`Desteklenmeyen dosya formatı: ${fileExtension || 'bilinmiyor'}, URI: ${uri.substring(0, 50)}...`);
      // Format bilinmiyorsa bile devam edelim - genelde platform URI'ları doğru formattadır
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        console.log('Platform URI olduğu için işleme devam ediliyor');
      } else {
        throw new Error(`Desteklenmeyen dosya formatı: ${fileExtension || 'bilinmiyor'}`);
      }
    }

    // Dosya varlığını kontrol et - hata işleme iyileştirildi
    if (isPlatformFile) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error('Dosya bulunamadı: ' + uri);
        }
        
        console.log(`Dosya mevcut: ${uri.substring(0, 50)}..., boyut: ${fileInfo.size} bytes`);
      } catch (fileCheckError) {
        console.error('Dosya kontrol hatası:', fileCheckError);
        // iOS'ta bazı dosya yolları kontrol edilemeyebilir, bu durumda devam edelim
        if (Platform.OS !== 'ios') {
          throw new Error('Dosya kontrol edilemedi: ' + fileCheckError.message);
        } else {
          console.warn('iOS dosya kontrol hatası görmezden geliniyor:', fileCheckError.message);
        }
      }
    }

    // Resmi fetch et - platform tipine göre farklı stratejiler kullanalım
    let fileData;
    
    try {
      if (isPlatformFile) {
        // Dosya sisteminden okuma - hata kontrolü eklenmiş
        try {
          let base64;
          
          // iOS ve Android için farklı stratejiler
          if (Platform.OS === 'ios') {
            try {
              base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
            } catch (iosReadError) {
              console.warn('iOS okuma hatası, alternatif yöntem deneniyor:', iosReadError.message);
              // iOS'ta bazı URI'lar FileSystem ile okunamaz, fetch kullanmayı deneyelim
              const response = await fetch(uri);
              const blob = await response.blob();
              base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const base64Data = reader.result as string;
                  resolve(base64Data.split(',')[1]);
                };
                reader.onerror = () => reject(new Error('Dosya okuma hatası'));
                reader.readAsDataURL(blob);
              });
            }
          } else {
            // Android için normal FileSystem kullanımı
            base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }
          
          if (!base64) {
            throw new Error('Dosya okunamadı');
          }
          
          const fileInfo = await FileSystem.getInfoAsync(uri);
          
          fileData = {
            base64,
            size: fileInfo.size || 0
          };
          
          // Dosya boyutu kontrolü
          if (fileData.size > 5 * 1024 * 1024) {
            throw new Error('Fotoğraf boyutu 5MB\'dan büyük olamaz.');
          }
          
        } catch (readError) {
          console.error('Dosya okuma hatası:', readError);
          throw new Error('Dosya okuma hatası: ' + (readError.message || 'Bilinmeyen hata'));
        }
      } else {
        // Uzak URL'den indirme
        try {
          const fetchTimeout = 10000; // 10 saniye
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);
          
          const response = await fetch(uri, {
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`Fotoğraf alınamadı: ${response.status} ${response.statusText}`);
          }
          
          const blob = await response.blob();
          
          // Dosya boyutunu kontrol et (5MB limit)
          if (blob.size > 5 * 1024 * 1024) {
            throw new Error('Fotoğraf boyutu 5MB\'dan büyük olamaz.');
          }
          
          // Blob'u base64'e çevir
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const base64 = reader.result as string;
              resolve(base64.split(',')[1]);
            };
            reader.onerror = () => {
              reject(new Error('Dosya okuma hatası'));
            };
          });
          
          reader.readAsDataURL(blob);
          const base64 = await base64Promise;
          
          fileData = {
            base64,
            size: blob.size
          };
        } catch (fetchError) {
          if (fetchError.name === 'AbortError') {
            throw new Error('Fotoğraf indirme işlemi zaman aşımına uğradı.');
          }
          throw fetchError;
        }
      }
    } catch (fileProcessError) {
      console.error('Dosya işleme hatası:', fileProcessError);
      throw new Error('Fotoğraf işlenirken hata oluştu: ' + fileProcessError.message);
    }

    console.log(`Resim boyutu: ${(fileData.size / 1024).toFixed(2)} KB`);

    try {
      // Güvenli decode işlemi
      let buffer;
      try {
        buffer = decode(fileData.base64);
      } catch (decodeError) {
        console.error('Base64 decode hatası:', decodeError);
        throw new Error('Fotoğraf verisi doğru şekilde çözülemedi. Lütfen farklı bir fotoğraf deneyin.');
      }
      
      // Supabase'e bağlanma ve yükleme işlemi
      try {
        console.log(`Supabase'e yükleniyor: ${bucket}/${fileName}`);
        
        // Supabase storage'a yükle - timeout eklenmiş
        const uploadPromise = supabase.storage
          .from(bucket)
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });
          
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Yükleme zaman aşımına uğradı')), 30000) // 30 saniye
        );
        
        const { data, error } = await Promise.race([uploadPromise, timeoutPromise]) as any;

        if (error) {
          console.error('Supabase yükleme hatası:', error);
          
          // RLS hatası durumunda daha açıklayıcı mesaj
          if (error.message?.includes('row-level security') || error.statusCode === 403) {
            throw new Error('Yetkilendirme hatası: Dosya yükleme izniniz yok. Lütfen uygulamaya tekrar giriş yapın.');
          }
          
          throw error;
        }

        // Public URL'i al
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        console.log('Fotoğraf başarıyla yüklendi:', publicUrl);
        return { url: publicUrl };
      } catch (uploadError: any) {
        console.error('Supabase yükleme hatası:', uploadError);
        
        if (uploadError.message?.includes('timeout') || 
            uploadError.message?.includes('zaman aşımı') ||
            uploadError.code === 'ECONNABORTED') {
          throw new Error('Sunucuya bağlanırken zaman aşımına uğradı. Lütfen daha sonra tekrar deneyin.');
        }
        
        throw new Error(`Fotoğraf yüklenirken hata oluştu: ${uploadError.message || 'Sunucuya erişilemiyor'}`);
      }
    } catch (finalError) {
      console.error('Son aşama hatası:', finalError);
      throw finalError;
    }
  } catch (error: any) {
    console.error('Fotoğraf yükleme hatası:', error);
    // Hata mesajını daha açıklayıcı hale getir
    const errorMessage = error.message || 'Fotoğraf yüklenirken bir hata oluştu';
    throw new Error(errorMessage);
  }
} 