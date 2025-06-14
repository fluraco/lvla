import React, { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { RegisterProvider } from './src/contexts/RegisterContext';
import { UserProvider } from './src/contexts/UserContext';
import { FontSizeProvider } from './src/contexts/FontSizeContext';
import { Navigation } from './src/navigation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { AnnouncementProvider } from './src/contexts/AnnouncementContext';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { configurePushNotifications, createNotificationChannels } from './src/services/pushNotification';
import { IAPService } from './src/services/IAPService';

// Öncelik ayarları
Notifications.setNotificationChannelAsync('default', {
  name: 'default',
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#FF4B7E',
});

// Bildirimlerin nasıl görüntüleneceğini yapılandır
Notifications.setNotificationHandler({
  handleNotification: async () => {
    console.log('Bildirim alındı, işleniyor (App.tsx)');
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    };
  },
  handleSuccess: (notificationId) => {
    console.log('Bildirim başarıyla gösterildi:', notificationId);
  },
  handleError: (error) => {
    console.error('Bildirim gösterilirken hata oluştu:', error);
  }
});

export default function App() {
  // Android bildirim kanallarını oluştur
  useEffect(() => {
    // Android status bar ayarları
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
    
    // Bildirim servisini başlat
    const setupNotifications = async () => {
      try {
        console.log('Bildirim sistemi başlatılıyor...');
        
        // Bildirimlerin nasıl görüntüleneceğini yapılandır
        configurePushNotifications();
        
        // Android için bildirim kanallarını oluştur
        await createNotificationChannels();
        
        console.log('Bildirim sistemi başarıyla başlatıldı');
      } catch (error) {
        console.error('Bildirim sistemi başlatılırken hata:', error);
      }
    };
    
    setupNotifications();

    // IAP servisini başlat
    const initializeIAP = async () => {
      try {
        const iapService = IAPService.getInstance();
        await iapService.initialize();
        console.log('IAP servisi başlatıldı');
      } catch (error) {
        console.error('IAP servisi başlatılırken hata:', error);
      }
    };

    initializeIAP();

    // Cleanup fonksiyonu
    return () => {
      const cleanupIAP = async () => {
        try {
          const iapService = IAPService.getInstance();
          await iapService.finalize();
        } catch (error) {
          console.error('IAP servisi kapatılırken hata:', error);
        }
      };
      
      cleanupIAP();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <UserProvider>
            <FontSizeProvider>
              <RegisterProvider>
                <NotificationProvider>
                  <AnnouncementProvider>
                    <Navigation />
                    <StatusBar 
                      style="light" 
                      backgroundColor="transparent"
                      translucent={true}
                      barStyle="light-content"
                    />
                  </AnnouncementProvider>
                </NotificationProvider>
              </RegisterProvider>
            </FontSizeProvider>
          </UserProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
