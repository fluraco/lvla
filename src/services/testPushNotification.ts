import * as Notifications from 'expo-notifications';
import { sendLocalNotification } from './pushNotification';

/**
 * Test amaçlı farklı bildirim tipleri gönderme
 */
export const sendTestMatchNotification = async () => {
  await sendLocalNotification({
    title: 'Yeni Eşleşme!',
    body: 'Ayşe ile eşleştin. Hemen mesajlaşmaya başla!',
    data: {
      type: 'match',
      id: 'test-match-1',
      relatedEntityId: 'user-test',
      relatedEntityType: 'match'
    }
  });
};

export const sendTestLikeNotification = async () => {
  await sendLocalNotification({
    title: 'Yeni Beğeni!',
    body: 'Mehmet profilini beğendi.',
    data: {
      type: 'like',
      id: 'test-like-1',
      relatedEntityId: 'user-test',
      relatedEntityType: 'like'
    }
  });
};

export const sendTestSuperLikeNotification = async () => {
  await sendLocalNotification({
    title: 'Süper Beğeni Aldın!',
    body: 'Zeynep profilini süper beğendi!',
    data: {
      type: 'superlike',
      id: 'test-superlike-1',
      relatedEntityId: 'user-test',
      relatedEntityType: 'like'
    }
  });
};

export const sendTestMessageNotification = async () => {
  await sendLocalNotification({
    title: 'Yeni Mesaj',
    body: 'Ayşe: Merhaba, nasılsın?',
    data: {
      type: 'message',
      id: 'test-message-1',
      relatedEntityId: 'message-test',
      relatedEntityType: 'message'
    }
  });
};

/**
 * Bu fonksiyon, gösterilecek bildirim izni için kullanıcıdan izin isteyecek ve 
 * belirlenen süre sonra örnek bir bildirim gösterecektir
 */
export const scheduleTestNotification = async (
  seconds: number = 5,
  title: string = 'Test Bildirimi',
  body: string = 'Bu bir test bildirimidir.'
) => {
  // Bildirim gösterme izni iste
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    alert('Bildirim izni verilmedi!');
    return;
  }

  // Bildirim zamanla
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { screen: 'Home' },
    },
    trigger: {
      seconds,
    },
  });
  
  alert(`${seconds} saniye sonra bildirim gösterilecek.`);
}; 