import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Modal,
  Alert,
  Linking,
  ProgressBarAndroid,
  Keyboard,
  ScrollView,
  Animated,
} from 'react-native';
import { Text } from 'react-native-elements';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../theme';
import { MaterialCommunityIcons, Ionicons, FontAwesome5, AntDesign, FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRealtimeChat } from '../../../hooks/useRealtimeChat';
import { useUser } from '../../../contexts/UserContext';
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, differenceInMinutes, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { decode } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { sendMessageNotification, sendGiftNotification } from '../../../services/notification';

// Mesaj tiplerini tanımlıyoruz
type MessageType = 'text' | 'audio' | 'info' | 'gift';

// Mesaj yapısı
interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  isMe: boolean;
  duration?: string; // Ses kayıtları için
  metadata?: any;
}

// Hediye tipi tanımlama
interface Gift {
  id: string;
  name: string;
  image_url: string;
  credit_value: number;
  description?: string;
}

// Arama tipi tanımlama
type CallType = 'audio' | 'video';

// Arama durumu tanımlama
type CallStatus = 'ringing' | 'connected' | 'ended';

// Hediye emojileri eşleştirme
const giftEmojis: {[key: string]: string} = {
  'Çay': '🍵',
  'Kahve': '☕️',
  'Kalp': '❤️',
  'Çiçek': '🌸',
  'Gül': '🌹',
  'Buket': '💐',
  'Aşk Oku': '💘',
  'Aşk İksiri': '🧪',
  'Tektaş Yüzük': '💍',
};

// Hediye adına göre emoji döndüren yardımcı fonksiyon
const getGiftEmoji = (giftName: string): string => {
  return giftEmojis[giftName] || '🎁'; // Varsayılan olarak hediye emoji'si
};

// Kullanıcı kredisi tipi
interface UserCredit {
  user_id: string;
  credit_amount: number;
}

// Ana No kullanıcısı için örnek konuşma verileri
const EXAMPLE_MESSAGES: Message[] = [
  {
    id: '1',
    type: 'text',
    content: '19 Nis Cmt',
    timestamp: new Date('2024-04-19T12:00:00'),
    isMe: false,
    // Bu bir tarih bilgisi aslında, isMe değerini false yaparak ortada gösterilmesini sağlıyoruz
  },
  {
    id: '2',
    type: 'text',
    content: 'Ferdi ocaktar',
    timestamp: new Date('2024-04-19T17:19:00'),
    isMe: false,
  },
  {
    id: '3',
    type: 'text',
    content: 'Pazartesi',
    timestamp: new Date('2024-04-22T10:00:00'),
    isMe: false,
    // Bu bir tarih bilgisi
  },
  {
    id: '4',
    type: 'text',
    content: `Sahip Bilgileri
TC/VKN    10935148876
Ad Soyad  BERKAN KOÇ
Müşteri Tipi    Gerçek
Cinsiyet    Erkek
Adres   YEŞİLKENT MAH MAH. 2011 SK SK. INNOVIA 3ETAP Han/Apt No No: 18G D: 100 ESENYURT İSTANBUL
TelefonN/A
Araç Bilgileri
Kullanım Tarzı  01 / HUSUSİ OTOMOBİL (SÜRÜCÜ DAHİL 1 - 9 KOLTUK)
Model  2020
Marka  TOFAS-FIAT
Tip EGEA HB MIRROR 1.3 M.JET 95 E6D
Plaka   52ADT755
Motor No   55283775702454
Şasi No    ZFA3560000S85933
Silindir Hacmi  1248
Motor Gücü    N/A
Trafik Tescil Tarihi  10/09/2024
İlk Tescil Tarihi  05/11/2020`,
    timestamp: new Date('2024-04-22T11:30:00'),
    isMe: false,
  },
  {
    id: '5',
    type: 'audio',
    content: 'Audio Message',
    timestamp: new Date('2024-04-22T12:08:00'),
    isMe: false,
    duration: '03:04',
  },
];

// Rota parametre tipi
type ChatDetailRouteProp = RouteProp<
  {
    ChatDetail: {
      conversationId: string;
      userName: string;
      userAvatar: string;
      showGift?: boolean; // Hediye modalını otomatik açmak için opsiyonel parametre
    };
  },
  'ChatDetail'
>;

// Navigation için tip tanımı
type NavigationProp = {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
};

// iPhone için ilerleme çubuğu bileşeni
const ProgressBar = ({ progress, color }: { progress: number, color: string }) => {
  return (
    <View style={[styles.customProgressBar, { backgroundColor: '#444' }]}>
      <View 
        style={[
          styles.customProgressFill, 
          { 
            width: `${progress * 100}%`,
            backgroundColor: color,
          }
        ]} 
      />
    </View>
  );
};

// Ekran boyutları
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export function ChatDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ChatDetailRouteProp>();
  const { conversationId, userName, userAvatar, showGift } = route.params || {
    conversationId: '1',
    userName: 'Ana No (Siz)',
    userAvatar: 'https://via.placeholder.com/150',
    showGift: false
  };

  const { user } = useUser();
  const [inputMessage, setInputMessage] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  
  // Realtime chat hook'unu kullan
  const { 
    messages, 
    sendMessage, 
    isLoading, 
    error 
  } = useRealtimeChat({ 
    roomId: conversationId,
    // Tip ve metadata desteği için obje olarak ikinci parametre ekleyelim
    messageOptions: {
      supportAudio: true,
      supportImages: true
    }
  });

  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPickerActive, setIsPickerActive] = useState(false);  // Dosya seçici durumunu takip etmek için

  // Mesaj silme için yeni state'ler
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [locallyDeletedMessageIds, setLocallyDeletedMessageIds] = useState<string[]>([]);

  // Yükleme durum göstergeleri için yeni state'ler
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProgressVisible, setIsProgressVisible] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');

  // Mesaj listesi için ref oluştur
  const flatListRef = useRef<FlatList>(null);
  
  // Hediye modalı için yeni state'ler
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [isLoadingGifts, setIsLoadingGifts] = useState(false);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [userCredit, setUserCredit] = useState<number>(0);
  const [isSendingGift, setIsSendingGift] = useState(false);

  // Görüşme için state'ler
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState<CallType>('audio');
  const [callStatus, setCallStatus] = useState<CallStatus>('ringing');
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [ringCount, setRingCount] = useState(0);
  const ringTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ringingSoundRef = useRef<Audio.Sound | null>(null);

  // Silinen mesajları AsyncStorage'dan yükleme
  useEffect(() => {
    const loadDeletedMessages = async () => {
      if (!user || !conversationId) return;
      
      try {
        // Her kullanıcının her sohbet için sildiği mesajları ayrı bir anahtarla saklıyoruz
        const storageKey = `deleted_messages_${user.id}_${conversationId}`;
        const storedData = await AsyncStorage.getItem(storageKey);
        
        if (storedData) {
          const deletedIds = JSON.parse(storedData);
          console.log('Yüklenen silinen mesaj IDs:', deletedIds);
          setLocallyDeletedMessageIds(deletedIds);
        }
      } catch (err) {
        console.error('Silinen mesajlar yüklenirken hata:', err);
      }
    };
    
    loadDeletedMessages();
  }, [user, conversationId]);

  // Karşı tarafın ID'sini öğrenme
  useEffect(() => {
    const fetchRoomParticipants = async () => {
      if (!user || !conversationId) return;

      try {
        // Odadaki diğer katılımcıyı getir
        const { data, error } = await supabase
          .from('room_participants')
          .select(`
            user_id,
            users:user_id (
              id,
              first_name,
              last_name,
              profile_photo
            )
          `)
          .eq('room_id', conversationId)
          .neq('user_id', user.id)
          .limit(1);

        if (error) {
          console.error('Oda katılımcıları alınamadı:', error);
          return;
        }

        if (data && data.length > 0) {
          // Diğer kullanıcının ID'sini kaydet
          setOtherUserId(data[0].user_id);
          console.log('Diğer kullanıcının ID\'si alındı:', data[0].user_id);
        }
      } catch (error) {
        console.error('Oda katılımcıları alınırken hata:', error);
      }
    };

    fetchRoomParticipants();
  }, [conversationId, user]);

  // Kullanıcının premium durumunu kontrol et
  const checkUserPremium = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_premium')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Premium durumu kontrol edilirken hata:', error);
        return;
      }
      
      setIsPremium(data?.is_premium || false);
      
    } catch (error) {
      console.error('Premium durumu kontrol edilirken beklenmeyen hata:', error);
    }
  };
  
  // Sayfa yüklendiğinde premium durumunu kontrol et
  useEffect(() => {
    checkUserPremium();
  }, [user]);

  // Kullanıcı kredilerini getir
  const fetchUserCredit = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('credit_amount')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Kredi bilgisi getirme hatası:', error);
        return;
      }
      
      if (data) {
        setUserCredit(data.credit_amount);
      } else {
        // Kullanıcının kredi kaydı yoksa, varsayılan olarak 1000 kredi tanımla
        const { error: insertError } = await supabase
          .from('user_credits')
          .insert({ user_id: user.id, credit_amount: 1000 });
        
        if (insertError) {
          console.error('Kredi oluşturma hatası:', insertError);
      return;
    }

        setUserCredit(1000);
      }
    } catch (err) {
      console.error('Kredi bilgisi alınırken hata:', err);
    }
  }, [user]);

  // Tüm hediyeleri getir
  const fetchGifts = useCallback(async () => {
    setIsLoadingGifts(true);
    try {
      const { data, error } = await supabase
        .from('gifts')
        .select('*')
        .order('credit_value', { ascending: true });
      
      if (error) {
        console.error('Hediyeler getirilirken hata:', error);
        return;
      }
      
      if (data) {
        setGifts(data as Gift[]);
      }
    } catch (err) {
      console.error('Hediyeler alınırken hata:', err);
    } finally {
      setIsLoadingGifts(false);
    }
  }, []);

  // Bu fonksiyonu useEffect içinde çağıracağız
  const loadUserMessageCredits = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_message_credits')
        .select('credit_amount')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Mesaj kredileri yüklenirken hata:', error);
        return;
      }

      setUserMessageCredits(data?.credit_amount || 0);
      console.log('Mevcut mesaj kredisi:', data?.credit_amount || 0);
    } catch (err) {
      console.error('Mesaj kredileri yüklenirken beklenmeyen hata:', err);
    }
  };

  // Yüklendiğinde mesaj kredisini yükle
  useEffect(() => {
    loadUserMessageCredits();
  }, [user]);

  // Hediye modalı açıldığında hediyeleri ve kullanıcı kredisini getir
  useEffect(() => {
    if (showGiftModal) {
      fetchGifts();
      fetchUserCredit();
    }
  }, [showGiftModal, fetchGifts, fetchUserCredit]);

  // Hediye Gönder butonuna tıklandığında modal'ı göster
  const handleShowGiftModal = () => {
    setSelectedGift(null);
    setShowGiftModal(true);
  };

  // Mesaj kredisini düşüren fonksiyon
  const decreaseMessageCredit = async () => {
    if (!user?.id) return false;
    
    try {
      // Mevcut kredi miktarını al
      const { data: currentCreditData, error: creditCheckError } = await supabase
        .from('user_message_credits')
        .select('credit_amount')
        .eq('user_id', user.id)
        .single();
      
      if (creditCheckError && creditCheckError.code !== 'PGRST116') {
        console.error('Mesaj kredisi kontrolü yapılırken hata:', creditCheckError);
        return false;
      }
      
      const currentCredit = currentCreditData?.credit_amount || 0;
      
      // Kredi yoksa işlemi durdur
      if (currentCredit <= 0) {
        console.warn('Mesaj kredisi yetersiz');
        return false;
      }
      
      // Krediyi 1 azalt
      const newCreditAmount = currentCredit - 1;
      
      // Veritabanında güncelle
      const { error: updateError } = await supabase
        .from('user_message_credits')
        .update({ 
          credit_amount: newCreditAmount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (updateError) {
        console.error('Mesaj kredisi azaltılırken hata:', updateError);
        return false;
      }
      
      // Kredi işlem kaydı oluştur
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          credit_amount: 1,
          transaction_type: 'usage',
          description: 'Mesaj gönderimi',
          credit_type: 'message',
          transaction_date: new Date().toISOString()
        });
      
      if (transactionError) {
        console.error('Kredi işlemi kaydedilirken hata:', transactionError);
      }
      
      // Lokal state'i güncelle
      setUserMessageCredits(newCreditAmount);
      console.log('Mesaj kredisi azaltıldı. Yeni miktar:', newCreditAmount);
      
      return true;
    } catch (err) {
      console.error('Mesaj kredisi azaltma işleminde beklenmeyen hata:', err);
      return false;
    }
  };

  // Hediye seçildiğinde
  const handleSelectGift = (gift: Gift) => {
    setSelectedGift(gift);
  };

  // Hediye gönderme
  const handleSendGift = async () => {
    if (!selectedGift || !user || !otherUserId) {
      Alert.alert('Hata', 'Lütfen bir hediye seçin ve tekrar deneyin.');
      return;
    }
    
    // Kredi kontrolü
    if (userCredit < selectedGift.credit_value) {
      Alert.alert(
        'Yetersiz Kredi', 
        `Bu hediyeyi göndermek için yeterli krediniz yok. ${selectedGift.credit_value - userCredit} daha krediye ihtiyacınız var.`,
        [{ text: 'Tamam', onPress: () => {} }]
      );
      return;
    }
    
    try {
      setIsSendingGift(true);
      
      // Kullanıcı adlarını güvenle alalım - kullanıcı adı için tüm olası kaynakları kontrol edelim
      const senderName = user?.first_name || user?.id?.substring(0, 8) || 'Kullanıcı';
      
      // Mesaj metadatasını oluştur
      const giftMetadata = {
        gift_id: selectedGift.id,
        gift_name: selectedGift.name,
        gift_image: selectedGift.image_url,
        gift_value: selectedGift.credit_value,
        sender_name: senderName, // Gönderenin adını metadataya ekliyoruz
        sender_id: user.id // Gönderen ID'sini de ekleyelim
      };
      
      // Hediye mesajı gönder - içeriği (content) metadatayı yansıtacak şekilde oluşturalım
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          room: conversationId,
          content: `Hediye: ${selectedGift.name}`, // Mesaj içeriğinde hediye adı yeterli bilgiyi sağlar
          user_id: user.id,
          type: 'gift', // Tür alanını açıkça 'gift' olarak ayarlıyoruz
          metadata: giftMetadata,
          read_by: [user.id]
        })
        .select()
        .single();
      
      if (messageError) {
        throw messageError;
      }
      
      // Gönderilen hediyeyi kaydet
      const { error: sentGiftError } = await supabase
        .from('sent_gifts')
        .insert({
          gift_id: selectedGift.id,
          sender_id: user.id,
          receiver_id: otherUserId,
          room_id: conversationId,
          message_id: messageData.id
        });
      
      if (sentGiftError) {
        console.error('Hediye kaydedilirken hata:', sentGiftError);
      }
      
      // Kullanıcı kredisini güncelle
      const newCreditAmount = userCredit - selectedGift.credit_value;
      const { error: creditError } = await supabase
        .from('user_credits')
        .update({ credit_amount: newCreditAmount, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      
      if (creditError) {
        console.error('Kredi güncellenirken hata:', creditError);
      }
      
      // Lokak kredi değerini güncelle
      setUserCredit(newCreditAmount);
      
      // Modal'ı kapat
      setShowGiftModal(false);
      setSelectedGift(null);
      
      // Başarı mesajı
      setTimeout(() => {
        Alert.alert('Başarılı', `"${selectedGift.name}" hediyesi başarıyla gönderildi!`);
      }, 500);
      
    } catch (err) {
      console.error('Hediye gönderilirken hata:', err);
      Alert.alert('Hata', 'Hediye gönderilirken bir sorun oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSendingGift(false);
    }
  };

  // Hediye içerikli mesajı render et
  const GiftMessage = ({ message, isMe, isSelected }: { message: any, isMe: boolean, isSelected: boolean }) => {
    // Hediye bilgilerini metadata'dan al veya içerikten çıkar
    const giftMetadata = message.metadata || {};
    
    // Hediye adını belirle - ya metadata'dan al ya da içerikten çıkar
    let giftName = giftMetadata.gift_name || '';
    if (!giftName && message.content && message.content.startsWith('Hediye: ')) {
      const contentParts = message.content.split(': ');
      if (contentParts.length > 1) {
        giftName = contentParts[1];
      }
    }
    
    // Hediye adı hala yoksa varsayılan değer kullan
    if (!giftName) {
      giftName = 'Hediye';
    }
    
    // Hediye emoji'sini al
    const giftEmoji = getGiftEmoji(giftName);
    
    // Gönderenin adını düzgün şekilde belirle
    let senderName = '';
    
    if (isMe) {
      senderName = 'Sen';
    } else if (message.user?.first_name) {
      senderName = `${message.user.first_name} ${message.user.last_name || ''}`;
    } else if (message.user?.name) {
      senderName = message.user.name;
    } else if (giftMetadata.sender_name) {
      senderName = giftMetadata.sender_name;
    } else {
      senderName = 'Kullanıcı';
    }
    
    return (
      <View style={[
        styles.messageContainer, 
        isMe ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.giftMessageBubble, 
          isMe ? styles.myMessageBubble : styles.otherMessageBubble,
          isSelected && styles.selectedMessageBubble
        ]}>
          <LinearGradient
            colors={['#FF6B7D', '#F3AC3D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.giftGradient}
          >
            {!isMe && (
              <Text style={styles.messageSender}>
                {senderName}
              </Text>
            )}
            
            <View style={styles.giftEmojiContainer}>
              <Text style={styles.giftEmoji}>{giftEmoji}</Text>
            </View>
            
            <Text style={styles.giftText}>
              {isMe ? 
                `${giftName} gönderdin` : 
                `${giftName} gönderdi`
              }
            </Text>
            
            <View style={styles.giftValueContainer}>
              <Text style={styles.giftValueText}>
                {giftMetadata.gift_value || 0} kredi değerinde
              </Text>
            </View>
            
            <View style={styles.messageTimestamp}>
              <Text style={[styles.timestampText, { color: 'rgba(255, 255, 255, 0.9)' }]}>
                {formatMessageDate(message.created_at)}
              </Text>
              {isMe && (
                <MaterialCommunityIcons name="check-all" size={16} color="#FFFFFF" />
              )}
            </View>
          </LinearGradient>
        </View>
        {isSelected && (
          <View style={styles.selectedCheckmark}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
          </View>
        )}
      </View>
    );
  };

  // Mesaj gönderme fonksiyonu - kredi düşürme ile
  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return;
    
    // Mesaj kurallarını henüz görmemişse kuralları göster
    if (!hasSeenRules) {
      setShowMessageRulesModal(true);
      return;
    }
    
    // Mesaj kredisi kontrolü yap
    if (userMessageCredits <= 0) {
      // Kredi yetersizse modal göster
      setShowNoCreditModal(true);
      return;
    }
    
    try {
      // Mesajı gönder - sadece metin mesajları için
      const result = await sendMessage(inputMessage);
      
      // Mesaj başarıyla gönderildiyse krediyi düşür
      if (result) {
        await decreaseMessageCredit();
      }
      
      // Mesaj kutusunu temizle
      setInputMessage('');
    } catch (error) {
      console.error('Mesaj gönderilirken hata:', error);
      Alert.alert('Hata', 'Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin.');
    }
  };

  // Geri gitme fonksiyonu
  const handleGoBack = () => {
    navigation.goBack();
  };

  // Kullanıcı profilini açma fonksiyonu
  const handleOpenUserProfile = async () => {
    // Öncelikle odadan alınan katılımcı ID'yi kullan
    // Eğer bulunamadıysa mesajlardan bulmaya çalış
    // En son çare olarak conversationId'yi kullan
    const userIdToShow = otherUserId || 
      messages.find(m => m.user_id !== user?.id)?.user_id || 
      conversationId;
    
    try {
      // Kullanıcı detaylarını getir
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userIdToShow)
        .single();
        
      if (error) {
        console.error('Kullanıcı bilgisi alınamadı:', error);
        return;
      }
      
      if (data) {
        // Kullanıcı yaşını hesapla
        if (data.birth_date) {
          const birthDate = new Date(data.birth_date);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          setUserAge(age);
        }
        
        // Kullanıcı verilerini ayarla
        setProfileUser({
          ...data,
          photos: data.photos || [],
          interests: data.hobbies || [],
          location: data.location || { city: 'Bilinmeyen Şehir', country: 'Bilinmeyen Ülke' }
        });
        
        // Kullanıcının engellenip engellenmediğini kontrol et
        checkIfUserBlocked(userIdToShow);
        
        // Profil modalını göster
        setShowProfileDetail(true);
      }
    } catch (err) {
      console.error('Profil bilgileri alınırken hata:', err);
    }
  };

  // Tarih formatlaması - güncellenmiş
  const formatMessageDate = (dateString: string) => {
    try {
      const messageDate = new Date(dateString);
      const now = new Date();
      const diffInMinutes = differenceInMinutes(now, messageDate);
      
      // 1 dakikadan az önce ise "Şimdi" göster
      if (diffInMinutes < 1) {
        return 'Şimdi';
      }
      
      // 1 dakikadan fazla ise saat formatında göster
      return format(messageDate, 'HH:mm');
    } catch (err) {
      return '';
    }
  };

  // Tarih/Bilgi mesajı için formatlama fonksiyonu
  const formatGroupDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      
      if (isToday(date)) {
        return 'Bugün';
      } else if (isYesterday(date)) {
        return 'Dün';
      } else if (isThisWeek(date)) {
        // Haftanın gününü Türkçe olarak döndür
        const dayName = format(date, 'EEEE', { locale: tr });
        // İlk harfi büyük yap
        return dayName.charAt(0).toUpperCase() + dayName.slice(1);
      } else {
        // 1 haftadan fazla ise gün/ay/yıl formatında göster
        return format(date, 'dd/MM/yyyy');
      }
    } catch (err) {
      return '';
    }
  };

  // Tarih/Bilgi mesajı render bileşeni
  const InfoMessage = ({ content }: { content: string }) => (
    <View style={styles.infoMessageContainer}>
      <Text style={styles.infoMessageText}>{content}</Text>
    </View>
  );

  // Mesaj seçme/seçimi kaldırma fonksiyonu
  const toggleMessageSelection = (messageId: string) => {
    // Mevcut durumu kontrol et
    const isCurrentlySelected = selectedMessages.includes(messageId);
    
    if (isCurrentlySelected) {
      // Eğer mesaj zaten seçiliyse, seçimden kaldır
      const updatedSelection = selectedMessages.filter(id => id !== messageId);
      setSelectedMessages(updatedSelection);
      
      // Eğer hiç seçili mesaj kalmazsa, seçim modunu kapat
      if (updatedSelection.length === 0) {
        setSelectionMode(false);
      }
    } else {
      // Mesajı seçilmiş olarak ekle
      setSelectedMessages(prevSelected => [...prevSelected, messageId]);
      // Seçim modunu aktif et (zaten aktif değilse)
      if (!selectionMode) {
        setSelectionMode(true);
      }
    }
  };

  // Mesaj seçimini temizleme
  const clearSelection = () => {
    setSelectedMessages([]);
    setSelectionMode(false);
  };

  // Seçilen mesajları silme fonksiyonu
  const deleteSelectedMessages = async () => {
    if (selectedMessages.length === 0) return;

    try {
      // Onay sorusu sor
      Alert.alert(
        'Mesajları Sil',
        `Seçilen ${selectedMessages.length} mesajı silmek istediğinize emin misiniz? Bu işlem kalıcıdır ve sadece sizin görünümünüzden silinecektir.`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: async () => {
              // Mevcut silinen mesajlara yeni silinen mesajları ekle
              const updatedDeletedIds = [...locallyDeletedMessageIds, ...selectedMessages];
              setLocallyDeletedMessageIds(updatedDeletedIds);
              
              // AsyncStorage'a kaydet
              if (user && conversationId) {
                try {
                  const storageKey = `deleted_messages_${user.id}_${conversationId}`;
                  await AsyncStorage.setItem(storageKey, JSON.stringify(updatedDeletedIds));
                  console.log('Silinen mesajlar kaydedildi:', updatedDeletedIds);
                } catch (err) {
                  console.error('Silinen mesajlar kaydedilirken hata:', err);
                  Alert.alert('Uyarı', 'Silinen mesajlar kalıcı olarak kaydedilemedi, uygulama yeniden başlatıldığında geri gelebilir.');
                }
              }
              
              // Silinen mesajların veritabanında "deleted_for_user_ids" alanına kullanıcı ID'sini ekle
              // Bu yöntem veritabanında bir alan ekleme gerektirir
              /*
              for (const messageId of selectedMessages) {
                try {
                  const { error } = await supabase
                    .from('messages')
                    .update({ deleted_for_user_ids: [user?.id] })
                    .eq('id', messageId);
                  
                  if (error) {
                    console.error('Mesaj silinirken hata:', error);
                  }
                } catch (err) {
                  console.error('Supabase mesaj silme hatası:', err);
                }
              }
              */
              
              // Seçimi temizle
              clearSelection();
              
              // Başarı mesajı
              Alert.alert('Başarılı', 'Seçilen mesajlar kalıcı olarak görünümünüzden silindi.');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Mesaj silme hatası:', error);
      Alert.alert('Hata', 'Mesajlar silinirken bir hata oluştu.');
    }
  };

  // Belirli bir mesajı silme (tek mesaj için)
  const deleteSingleMessage = async (messageId: string) => {
    try {
      // Onay sorusu sor
      Alert.alert(
        'Mesajı Sil',
        'Bu mesajı silmek istediğinize emin misiniz? Bu işlem kalıcıdır ve sadece sizin görünümünüzden silinecektir.',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: async () => {
              // Mevcut silinen mesajlara yeni silinen mesajı ekle
              const updatedDeletedIds = [...locallyDeletedMessageIds, messageId];
              setLocallyDeletedMessageIds(updatedDeletedIds);
              
              // AsyncStorage'a kaydet
              if (user && conversationId) {
                try {
                  const storageKey = `deleted_messages_${user.id}_${conversationId}`;
                  await AsyncStorage.setItem(storageKey, JSON.stringify(updatedDeletedIds));
                  console.log('Silinen mesaj kaydedildi:', messageId);
                } catch (err) {
                  console.error('Silinen mesaj kaydedilirken hata:', err);
                  Alert.alert('Uyarı', 'Silinen mesaj kalıcı olarak kaydedilemedi, uygulama yeniden başlatıldığında geri gelebilir.');
                }
              }
              
              // Başarı mesajı
              Alert.alert('Başarılı', 'Mesaj kalıcı olarak görünümünüzden silindi.');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Mesaj silme hatası:', error);
      Alert.alert('Hata', 'Mesaj silinirken bir hata oluştu.');
    }
  };
  
  // Mesaja uzun basma işlemi - Seçim modu veya mesaj işlem menüsü göster
  const handleLongPressMessage = (messageId: string) => {
    // Seçim modunda değilse, işlem menüsü göster
    if (!selectionMode) {
      Alert.alert(
        'Mesaj İşlemleri',
        'Bu mesaj için bir işlem seçin:',
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Sil', 
            style: 'destructive',
            onPress: () => deleteSingleMessage(messageId)
          },
          { 
            text: 'Seç', 
            onPress: () => toggleMessageSelection(messageId)
          }
        ]
      );
    } else {
      // Zaten seçim modundaysa, mesajı seç/seçimini kaldır
      toggleMessageSelection(messageId);
    }
  };

  // Ses kaydı render bileşeni 
  const AudioMessage = ({ message, isMe, isSelected }: { message: any, isMe: boolean, isSelected: boolean }) => {
    // Ses URL'ini ayıkla
    const audioUrl = message.content.replace('audio:', '');
    const messageId = message.id;
    
    // Öncelikle metadata'dan durayonu al, yoksa yerel hesaplanan durayonu dene
    let duration = '00:00';
    if (message.metadata?.duration) {
      duration = message.metadata.duration;
    } else if (audioDuration[messageId]) {
      duration = formatAudioDuration(audioDuration[messageId]);
    }
    
    const isPlaying = playingMessageId === messageId;
    const progress = audioProgress[messageId] || 0;
    
    // Tarih bilgisini formatlama (timestamp render için)
    const messageTime = message.created_at ? format(new Date(message.created_at), 'HH:mm') : '';
    
    // Ses ilerlemesini manuel olarak ayarlama fonksiyonu
    const handleProgressBarPress = (event: any) => {
      const { locationX } = event.nativeEvent;
      const containerWidth = event.currentTarget.offsetWidth || event.currentTarget.measure((x, y, width) => width); 
      const newProgress = Math.max(0, Math.min(1, locationX / 200)); // 200 yaklaşık ses dalga genişliği
      
      // Eğer ses yüklenmişse, elle ilerleme noktasını ayarla
      if (audioPlayback[messageId]) {
        const sound = audioPlayback[messageId];
        // Önce ses dosyasının uzunluğunu al
        sound?.getStatusAsync().then(status => {
          if (status.isLoaded && status.durationMillis) {
            // Yeni pozisyonu hesapla
            const newPositionMillis = status.durationMillis * newProgress;
            // Sesi o pozisyona ayarla
            sound.setPositionAsync(newPositionMillis);
            // İlerleme durumunu güncelle
            setAudioProgress({...audioProgress, [messageId]: newProgress});
          }
        });
      }
    };
    
    return (
      <View style={[
        styles.messageContainer, 
        isMe ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.audioContainer,
          isMe ? styles.myMessageBubble : styles.otherMessageBubble,
          isSelected && styles.selectedMessageBubble
        ]}>
          <Image 
            source={{ 
              uri: message.user?.profile_photo || message.user?.avatar_url || userAvatar 
            }} 
            style={styles.audioAvatar} 
          />
          <TouchableOpacity 
            style={[styles.playButton, isPlaying && styles.pauseButton]}
            onPress={() => toggleAudioPlayback(messageId, audioUrl)}
          >
            <FontAwesome 
              name={isPlaying ? "pause" : "play"} 
              size={20} 
              color="#FFF" 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.audioWaveContainer}
            onPress={handleProgressBarPress}
            activeOpacity={0.7}
          >
            <View style={styles.audioWaveBackground} />
            <View 
              style={[
                styles.audioWaveProgress, 
                { width: `${progress * 100}%` }
              ]} 
            />
          </TouchableOpacity>
          <View style={styles.audioDurationContainer}>
            <Text style={styles.audioDuration}>{duration}</Text>
            {isMe && (
              <MaterialCommunityIcons name="check-all" size={16} color="#64B5F6" />
            )}
          </View>
        </View>
        
        {/* Zaman bilgisi */}
        <View style={styles.messageTimestamp}>
          <Text style={styles.timestampText}>{messageTime}</Text>
          {isMe && <MaterialCommunityIcons name="check-all" size={14} color="#64B5F6" />}
        </View>
        
        {isSelected && (
          <View style={styles.selectedCheckmark}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
          </View>
        )}
      </View>
    );
  };

  // Fotoğraf render bileşeni güncellendi
  const TextMessage = ({ message, isMe, isSelected }: { message: any, isMe: boolean, isSelected: boolean }) => {
    const [imageLoading, setImageLoading] = useState(true);
    
    return (
      <View style={[
        styles.messageContainer,
        isMe ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.messageBubble, 
          isMe ? styles.myMessageBubble : styles.otherMessageBubble,
          isSelected && styles.selectedMessageBubble
        ]}>
          {!isMe && (
            <Text style={styles.messageSender}>
              {message.user?.first_name ? `${message.user.first_name} ${message.user.last_name || ''}` : message.user?.name || 'Kullanıcı'}
            </Text>
          )}
          {message.content.startsWith('image:') || 
           (message.content.startsWith('https://jezoimjppwsoiivvxspp.supabase.co/') && 
            (message.content.endsWith('.png') || message.content.endsWith('.jpg') || message.content.endsWith('.jpeg') || 
             message.content.endsWith('.gif') || message.content.endsWith('.webp'))) ? (
            <View style={styles.imageMessageContainer}>
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => handleOpenFullscreen(message.content.startsWith('image:') ? 
                  message.content.replace('image:', '') : message.content)}
              >
                <View style={styles.imageLoadingContainer}>
                  {imageLoading && (
                    <View style={styles.imageLoadingOverlay}>
                      <ActivityIndicator 
                        size="large" 
                        color="#FFFFFF" 
                      />
                    </View>
                  )}
                  <Image 
                    source={{ uri: message.content.startsWith('image:') ? 
                      message.content.replace('image:', '') : message.content }}
                    style={styles.messageImage}
                    resizeMode="cover"
                    onLoadStart={() => setImageLoading(true)}
                    onLoadEnd={() => setImageLoading(false)}
                    onError={(e) => {
                      console.error('Resim yükleme hatası:', e.nativeEvent.error);
                      setImageLoading(false);
                    }}
                  />
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.imageFullscreenButton}
                onPress={() => handleOpenFullscreen(message.content.startsWith('image:') ? 
                  message.content.replace('image:', '') : message.content)}
              >
                <MaterialCommunityIcons name="fullscreen" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.messageText}>{message.content}</Text>
          )}
          <View style={styles.messageTimestamp}>
            <Text style={styles.timestampText}>
              {formatMessageDate(message.created_at)}
            </Text>
            {isMe && (
              <MaterialCommunityIcons name="check-all" size={16} color="#64B5F6" />
            )}
          </View>
        </View>
        {isSelected && (
          <View style={styles.selectedCheckmark}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
          </View>
        )}
      </View>
    );
  };

  // Mesajları gruplandır (aynı gün içindeki mesajlar bir arada)
  const groupMessagesByDate = () => {
    if (!messages || messages.length === 0) return [];
    
    const groups: { [key: string]: any[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    const result: any[] = [];
    
    // Her tarih için info mesajı ve o tarihe ait mesajları ekle
    Object.keys(groups).forEach(date => {
      const formattedDate = formatGroupDate(groups[date][0].created_at);
      result.push({
        id: `date-${date}`,
        type: 'info',
        content: formattedDate,
        created_at: groups[date][0].created_at,
      });
      
      result.push(...groups[date]);
    });
    
    return result;
  };

  // Mesajlar yüklendiğinde veya değiştiğinde en alta kaydır
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      // Küçük bir gecikme ekleyelim ki FlatList içeriği render edildikten sonra kaydırma gerçekleşsin
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 200);
    }
  }, [isLoading, messages]);

  // Klavye görünümü değiştiğinde en alta kaydır
  useEffect(() => {
    const keyboardDidShowListener = Platform.OS === 'ios' 
      ? Keyboard.addListener('keyboardWillShow', () => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        })
      : Keyboard.addListener('keyboardDidShow', () => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        });

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  // Mesaj render edilecek öğelerin seçimi
  const renderItem = ({ item }: { item: any }) => {
    // Eğer mesaj yerel olarak silinmişse gösterme
    if (locallyDeletedMessageIds.includes(item.id)) {
      return null;
    }
    
    // Bilgi mesajı
    if (item.type === 'info') {
      return <InfoMessage content={item.content} />;
    }
    
    // Cevapsız Çağrı bildirimi olarak göster
    if (item.content && item.content.includes('Cevapsız Çağrı')) {
      return (
        <View style={styles.infoMessageContainer}>
          <View style={styles.missedCallContainer}>
            <MaterialCommunityIcons name="phone-missed" size={16} color="#FF5252" />
            <Text style={styles.missedCallText}>{item.content}</Text>
          </View>
          <Text style={styles.infoMessageTimestamp}>
            {formatMessageDate(item.created_at)}
          </Text>
        </View>
      );
    }
    
    // Kullanıcının kendi mesajı mı?
    const isMe = user ? item.user_id === user.id : false;
    
    // Bu mesaj seçili mi?
    const isSelected = selectedMessages.includes(item.id);
    
    // Hediye mesajı
    if (item.type === 'gift' || 
        (item.content && item.content.startsWith('Hediye: ')) || 
        (item.content && (
          item.content === 'Çay' || 
          item.content === 'Kahve' || 
          item.content === 'Kalp' || 
          item.content === 'Çiçek' || 
          item.content === 'Gül' || 
          item.content === 'Buket' || 
          item.content === 'Aşk Oku' || 
          item.content === 'Aşk İksiri' || 
          item.content === 'Tektaş Yüzük'
        ))) {
      // Eğer tip gift olarak belirtilmemişse ama içerik "Hediye: " ile başlıyorsa
      // veya hediye adlarından biriyse, mesaj tipini güncelleyelim
      if (item.type !== 'gift') {
        item.type = 'gift';
        
        // Metadata yoksa veya eksikse, içerikten oluşturalım
        if (!item.metadata || !item.metadata.gift_name) {
          let giftName = '';
          if (item.content.startsWith('Hediye: ')) {
            const contentParts = item.content.split(': ');
            if (contentParts.length > 1) {
              giftName = contentParts[1];
            }
          } else {
            // İçerik doğrudan hediye adıysa
            giftName = item.content;
          }
          
          // Basit bir metadata oluşturalım
          item.metadata = {
            gift_name: giftName || 'Hediye',
            gift_value: giftEmojis[giftName] ? 5 : 0, // Basit bir değer ataması
            gift_image: '', // Varsayılan bir resim URL'si eklenebilir
            // Temel metadata alanlarını ekleyelim
            sender_name: item.user?.first_name || 'Kullanıcı',
            sender_id: item.user_id
          };
        }
      }
      
      return (
        <TouchableOpacity
          onLongPress={() => handleLongPressMessage(item.id)}
          onPress={() => selectionMode && toggleMessageSelection(item.id)}
          delayLongPress={500}
          activeOpacity={0.7}
        >
          <GiftMessage 
            message={item} 
            isMe={isMe} 
            isSelected={isSelected}
          />
        </TouchableOpacity>
      );
    }
    
    // Ses kaydı
    if (item.content && item.content.startsWith('audio:')) {
      return (
        <TouchableOpacity
          onLongPress={() => handleLongPressMessage(item.id)}
          onPress={() => selectionMode && toggleMessageSelection(item.id)}
          delayLongPress={500}
          activeOpacity={0.7}
        >
          <AudioMessage 
            message={item} 
            isMe={isMe} 
            isSelected={isSelected}
          />
        </TouchableOpacity>
      );
    }
    
    // Normal metin mesajı veya resim mesajı
    return (
      <TouchableOpacity
        onLongPress={() => handleLongPressMessage(item.id)}
        onPress={() => selectionMode && toggleMessageSelection(item.id)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <TextMessage 
          message={item} 
          isMe={isMe} 
          isSelected={isSelected}
        />
      </TouchableOpacity>
    );
  };

  // Tam ekran görüntüleme için yeni state'ler
  const [isFullscreenVisible, setIsFullscreenVisible] = useState(false);
  const [fullscreenImageUri, setFullscreenImageUri] = useState('');
  const [imageScale, setImageScale] = useState(1);

  // Resmi tam ekran görüntüleme fonksiyonu
  const handleOpenFullscreen = (imageUri: string) => {
    setFullscreenImageUri(imageUri);
    setIsFullscreenVisible(true);
    setImageScale(1); // Yakınlaştırma değerini sıfırla
  };

  // Dosya seçme fonksiyonu - güncellendi
  const pickImageFromLibrary = async () => {
    // Zaten işlem devam ediyorsa çık
    if (isPickerActive || isUploading) return;

    try {
      // İşlem başlamadan önce state'i güncelle
      setIsPickerActive(true);

      // Photo Picker API 33+ ile otomatik kullanılır, permission kontrolü gereksiz
      
      // Galeriyi aç
      console.log('Galeri açılıyor...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        exif: false,
        base64: false,
      }).catch(error => {
        console.error('Galeri açılırken hata:', error);
        // Hata durumunda state'i sıfırla
        setIsPickerActive(false);
        return { canceled: true, assets: [] };
      });
      
      console.log('Galeri sonucu:', result.canceled ? 'İptal edildi' : 'Resim seçildi');
      
      // Kullanıcı iptal ettiyse veya resim seçmediyse
      if (result.canceled || !result.assets || result.assets.length === 0) {
        setIsPickerActive(false);
        return;
      }
      
      try {
        // Seçilen resmi işle ve gönder
        const selectedAsset = result.assets[0];
        
        // İlerleme bilgisini göster
        setProgressMessage('Resim yükleniyor, lütfen bekleyin...');
        setUploadProgress(0);
        setIsProgressVisible(true);
        
        // Resmi base64 formatına dönüştür
        let fileExtension = selectedAsset.uri.split('.').pop()?.toLowerCase();
        // URI'dan uzantı alınamadıysa varsayılan olarak jpg kullan
        if (!fileExtension || !['jpg', 'jpeg', 'png', 'heic', 'heif'].includes(fileExtension)) {
          fileExtension = 'jpg';
        }
        
        const fileName = `image_${Date.now()}.${fileExtension}`;
        const contentType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
        
        // Dosya URI'sinden içeriği oku - platform bazlı farklı yaklaşımlar
        let fileContent;
        try {
          // Dosya okuma işlemi
          fileContent = await FileSystem.readAsStringAsync(selectedAsset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        } catch (readError) {
          console.error('Dosya okuma hatası, alternatif yöntem deneniyor:', readError);
          
          // Alternatif yöntem: fetch API kullanarak dosyayı oku
          try {
            const response = await fetch(selectedAsset.uri);
            const blob = await response.blob();
            
            // Blob'u base64'e çevir
            fileContent = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = reader.result as string;
                // Base64 veriyi ayıkla (data:image/jpeg;base64, kısmını çıkar)
                const base64Data = base64.split(',')[1];
                resolve(base64Data);
              };
              reader.onerror = () => reject(new Error('Dosya okuma hatası'));
              reader.readAsDataURL(blob);
            });
          } catch (fetchError) {
            console.error('Alternatif dosya okuma da başarısız:', fetchError);
            throw new Error('Dosya okunamadı. Lütfen başka bir görsel deneyin.');
          }
        }
        
        if (!fileContent) {
          throw new Error('Dosya içeriği okunamadı');
        }
        
        // Upload başlat
        setIsUploading(true);
        // Picker işlemi bitti, artık yükleme işlemi başladı
        setIsPickerActive(false);
        
        // Progres güncellemesi için
        let progress = 10;
        const progressInterval = setInterval(() => {
          progress += 10;
          if (progress <= 90) {
            setUploadProgress(progress);
          }
        }, 300);
        
        // Supabase storage'a yükle
        const { data, error } = await supabase.storage
          .from('chat_images')
          .upload(`${user.id}/${fileName}`, decode(fileContent), {
            contentType,
            upsert: false
          });
          
        clearInterval(progressInterval);
        
        if (error) {
          throw error;
        }
        
        setUploadProgress(95);
        
        // Public URL al
        const { data: publicUrlData } = supabase.storage
          .from('chat_images')
          .getPublicUrl(`${user.id}/${fileName}`);
        
        const imageUrl = publicUrlData.publicUrl;
        
        setUploadProgress(100);
        setProgressMessage('Resim başarıyla yüklendi! Gönderiliyor...');
        
        // Resmi mesaj olarak gönder
        await sendMessage(`image:${imageUrl}`);
        
        // Mesaj kredisini düşür
        await decreaseMessageCredit();
        
        // İlerleme modalını kapat
        setTimeout(() => {
          setIsProgressVisible(false);
          setIsUploading(false);
        }, 500);
      } catch (err) {
        console.error('Görüntü yükleme hatası:', err);
        setIsProgressVisible(false);
        setIsUploading(false);
        Alert.alert('Hata', 'Görüntü yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
      }
    } catch (error) {
      console.error('Fotoğraf seçme işlemi hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçme işlemi sırasında hata oluştu.');
    } finally {
      // Her durumda isPickerActive'i false yap
      setIsPickerActive(false);
    }
  };

  // Komponentin kurulumu sırasında sesi önceden yükle
  useEffect(() => {
    // Temizleme fonksiyonu
    return () => {
      if (ringTimerRef.current) {
        clearInterval(ringTimerRef.current);
      }
      stopRingSound();
    };
  }, []);

  // Görüşme sesi için yeni fonksiyonlar - optimize edilmiş
  const playRingSound = async () => {
    console.log('Arama sesi çalınıyor...');
    
    try {
      // Herhangi bir ses daha önceden çalıyorsa durdur
      if (ringingSoundRef.current) {
        await ringingSoundRef.current.stopAsync();
        await ringingSoundRef.current.unloadAsync();
        ringingSoundRef.current = null;
      }
      
      // Ses dosyasını yükle ve çal - preloadedSound kullanmadan direkt çal
      console.log('Ses dosyası direkt yükleniyor...');
      const soundObject = await Audio.Sound.createAsync(
        require('../../../assets/sounds/ringtone.wav'),
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      
      ringingSoundRef.current = soundObject.sound;
      console.log('Ses dosyası yüklendi ve şimdi çalınıyor');
    } catch (error) {
      console.error('Ses çalma hatası:', error);
    }
  };

  const stopRingSound = async () => {
    console.log('Arama sesi durduruluyor...');
    
    try {
      if (ringingSoundRef.current) {
        console.log('Aktif çalan ses durduruluyor');
        await ringingSoundRef.current.stopAsync().catch(e => console.log('Stop error:', e));
        await ringingSoundRef.current.unloadAsync().catch(e => console.log('Unload error:', e));
        ringingSoundRef.current = null;
        console.log('Arama sesi başarıyla durduruldu');
      }
    } catch (error) {
      console.error('Ses durdurma hatası:', error);
    }
  };

  // Görüşme başlatma fonksiyonu güncellendi
  const handleCall = (type: CallType) => {
    // Premium kontrolü yap
    if (!isPremium) {
      // Premium değilse uyarı göster ve premium sayfasına yönlendir
      Alert.alert(
        'Premium Özellik',
        'Görüntülü ve sesli görüşme yapabilmek için Premium üye olmanız gerekmektedir.',
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Premium Ol', 
            onPress: () => navigation.navigate('PremiumScreen' as never) 
          }
        ]
      );
      return;
    }
    
    setCallType(type);
    setCallStatus('ringing');
    setIsCameraOn(type === 'video');
    setIsMicOn(true);
    setIsSpeakerOn(type === 'video');
    setRingCount(0);
    setShowCallModal(true);
    
    // Küçük bir gecikme ile ses çalmayı başlat (modal açıldıktan sonra)
    setTimeout(() => {
      playRingSound();
    }, 300);
    
    // Çalma sayacını başlat
    ringTimerRef.current = setInterval(() => {
      setRingCount(prev => {
        const newCount = prev + 1;
        console.log(`Arama çalıyor: ${newCount}. kez`);
        
        // 19 saniye sonra göstermeme uyarısı (yaklaşık 9-10 kez çalma)
        if (newCount >= 10) {
          if (ringTimerRef.current) {
            clearInterval(ringTimerRef.current);
          }
          stopRingSound();
          
          // Özel uyarı modalını göster ve kapat
          setTimeout(() => {
            setShowCustomAlert(true);
            setCallStatus('ended');
            
            // 3 saniye sonra uyarıyı kapat
            setTimeout(() => {
              setShowCustomAlert(false);
              setShowCallModal(false);
            }, 3000);
          }, 500);
        }
        return newCount;
      });
    }, 2000); // Her 2 saniyede bir çalsın
  };
  
  // Görüşme sonlandırma fonksiyonu güncellendi
  const handleEndCall = async () => {
    if (ringTimerRef.current) {
      clearInterval(ringTimerRef.current);
    }
    await stopRingSound();
    setShowCallModal(false);
    setCallStatus('ended');
  };
  
  // Komponentin unmount olduğunda sesleri temizle
  useEffect(() => {
    return () => {
      if (ringTimerRef.current) {
        clearInterval(ringTimerRef.current);
      }
      stopRingSound();
    };
  }, []);
  
  // Mikrofon durumunu değiştirme
  const toggleMic = () => {
    setIsMicOn(prev => !prev);
  };
  
  // Kamera durumunu değiştirme
  const toggleCamera = () => {
    setIsCameraOn(prev => !prev);
  };

  // Hoparlör/Ahize değiştirme fonksiyonu
  const toggleSpeaker = () => {
    setIsSpeakerOn(prev => !prev);
    console.log('Hoparlör durumu değiştirildi:', !isSpeakerOn);
  };

  // Profil detay modalı için state'ler
  const [showProfileDetail, setShowProfileDetail] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [profileDetailPhotoIndex, setProfileDetailPhotoIndex] = useState(0);
  const [userAge, setUserAge] = useState<number>(0);
  const [isUserBlocked, setIsUserBlocked] = useState(false); // Kullanıcının engellenip engellenmediğini takip etmek için

  // Route parametrelerine showGift eklendiğinde hediye modalını otomatik aç
  useEffect(() => {
    if (showGift) {
      // URL parametresi ile gelirse hediye modalını aç
      handleShowGiftModal();
    }
  }, [showGift]);

  // Özel uyarı state'i ekle ve render et
  const [showCustomAlert, setShowCustomAlert] = useState(false);

  // Özel uyarı için animasyon değerleri
  const [alertOpacity] = useState(new Animated.Value(0));
  const [alertScale] = useState(new Animated.Value(0.8));

  // Özel uyarıyı animasyonlu göster
  useEffect(() => {
    if (showCustomAlert) {
      // Animasyonu sıfırla ve başlat
      alertOpacity.setValue(0);
      alertScale.setValue(0.8);
      
      Animated.parallel([
        Animated.timing(alertOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(alertScale, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [showCustomAlert]);

  // Kullanıcının engellenip engellenmediğini kontrol etme
  const checkIfUserBlocked = async (userId: string) => {
    if (!user || !userId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('blocker_id', user.id)
        .eq('blocked_user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Engelleme durumu kontrol edilirken hata:', error);
        return;
      }
      
      // Kullanıcı engellenmişse true, engellenmemişse false
      setIsUserBlocked(!!data);
    } catch (err) {
      console.error('Engelleme durumu kontrol edilirken hata:', err);
    }
  };

  // Kullanıcıyı engelleme/engeli kaldırma fonksiyonu
  const handleToggleBlockUser = async () => {
    if (!user || !profileUser) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const targetUserId = profileUser.id;
      
      if (isUserBlocked) {
        // Engeli kaldır
        Alert.alert(
          'Engeli Kaldır',
          `${profileUser.first_name} ${profileUser.last_name} kullanıcısının engelini kaldırmak istediğinize emin misiniz?`,
          [
            { text: 'İptal', style: 'cancel' },
            { 
              text: 'Engeli Kaldır', 
              onPress: async () => {
                // Engellemeyi veritabanından kaldır
                const { error } = await supabase
                  .from('user_blocks')
                  .delete()
                  .eq('blocker_id', user.id)
                  .eq('blocked_user_id', targetUserId);
                
                if (error) {
                  console.error('Engel kaldırılırken hata:', error);
                  Alert.alert('Hata', 'Engel kaldırma işlemi sırasında bir sorun oluştu.');
                  return;
                }
                
                // Durumu güncelle
                setIsUserBlocked(false);
                Alert.alert('Başarılı', `${profileUser.first_name} ${profileUser.last_name} kullanıcısının engeli kaldırıldı.`);
              }
            }
          ]
        );
      } else {
        // Engelle
        Alert.alert(
          'Kullanıcıyı Engelle',
          `${profileUser.first_name} ${profileUser.last_name} kullanıcısını engellemek istediğinize emin misiniz? Engellediğiniz kullanıcı sizin profilinizi göremez ve size mesaj gönderemez.`,
          [
            { text: 'İptal', style: 'cancel' },
            { 
              text: 'Engelle', 
              style: 'destructive',
              onPress: async () => {
                // Kullanıcıyı engelle
                const { error } = await supabase
                  .from('user_blocks')
                  .insert({
                    blocker_id: user.id,
                    blocked_user_id: targetUserId,
                  });
                
                if (error) {
                  console.error('Kullanıcı engellenirken hata:', error);
                  Alert.alert('Hata', 'Engelleme işlemi sırasında bir sorun oluştu.');
                  return;
                }
                
                // Durumu güncelle
                setIsUserBlocked(true);
                Alert.alert('Başarılı', `${profileUser.first_name} ${profileUser.last_name} kullanıcısı engellendi.`);
                
                // Profil modalını kapat
                setTimeout(() => {
                  setShowProfileDetail(false);
                  // Sohbet ekranından geri dön (isteğe bağlı)
                  // handleGoBack();
                }, 1500);
              }
            }
          ]
        );
      }
    } catch (err) {
      console.error('Engelleme işlemi sırasında hata:', err);
      Alert.alert('Hata', 'İşlem sırasında bir sorun oluştu.');
    }
  };

  // Kredi yetersizliği durumu için state'ler
  const [showNoCreditModal, setShowNoCreditModal] = useState(false);
  const [userMessageCredits, setUserMessageCredits] = useState(0);

  // Ses kayıt state'leri ekleyelim (doğru yere yerleştir)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioPlayback, setAudioPlayback] = useState<{[key: string]: Audio.Sound | null}>({});
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<{[key: string]: number}>({});
  const [audioDuration, setAudioDuration] = useState<{[key: string]: number}>({});
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio izinlerini başlatma fonksiyonu
  const setupAudioMode = async () => {
    try {
      console.log('Audio modu ayarlanıyor...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      console.log('Audio modu başarıyla ayarlandı');
    } catch (error) {
      console.error('Audio modunu ayarlarken hata:', error);
    }
  };

  // Component mount edildiğinde audio izinlerini ayarla
  useEffect(() => {
    setupAudioMode();
    
    // Cleanup
    return () => {
      // Eğer kayıt devam ediyorsa durdur
      if (recordingInstance) {
        stopRecording(true);
      }
      
      // Oynatılan ses varsa durdur
      Object.values(audioPlayback).forEach((sound) => {
        if (sound) {
          sound.unloadAsync().catch(() => {});
        }
      });
    };
  }, []);

  // Ses kaydını başlat
  const startRecording = async () => {
    try {
      console.log('Ses kaydı başlatılması deneniyor...');
      
      // İlk olarak ses kaydı izinlerini kontrol et
      const { granted: recordingGranted } = await Audio.getPermissionsAsync();
      
      if (!recordingGranted) {
        console.log('Ses kaydı izni yok, isteniyor...');
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          Alert.alert(
            'İzin Gerekli', 
            'Ses kaydı yapabilmek için mikrofon izni gerekmektedir.',
            [
              { text: 'İptal', style: 'cancel' },
              { text: 'Ayarlara Git', onPress: () => Linking.openSettings() }
            ]
          );
          return;
        }
        console.log('Ses kaydı izni verildi');
      }

      // Tüm sesleri durdur
      Object.values(audioPlayback).forEach((sound) => {
        if (sound) {
          sound.pauseAsync().catch(() => {});
        }
      });
      
      setPlayingMessageId(null);
      
      // Audio modunu ayarla
      console.log('Audio modu ayarlanıyor...');
      await setupAudioMode();
      
      console.log('Kayıt başlatılıyor...');
      // Kayda başla
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });
      
      setRecordingInstance(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Kayıt süresini göstermek için timer başlat
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      // Haptic feedback ekle
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      console.log('Ses kaydı başladı');
    } catch (error) {
      console.error('Ses kaydı başlatılırken hata:', error);
      Alert.alert('Hata', 'Ses kaydı başlatılamadı. Lütfen tekrar deneyin.');
      setIsRecording(false);
    }
  };

  // Ses kaydını durdur ve gönder
  const stopRecording = async (cancel = false) => {
    try {
      // Timer'ı durdur
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      // Kayıt instance yok veya zaten durdurulduysa çık
      if (!recordingInstance) {
        setIsRecording(false);
        return;
      }

      // Haptic feedback ekle
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      console.log('Ses kaydı durduruluyor...');
      
      // İptal edilmediyse ve kayıt süresi minimum 1 saniyeden fazlaysa gönder
      if (!cancel && recordingDuration > 1) {
        try {
          await recordingInstance.stopAndUnloadAsync();
          const uri = recordingInstance.getURI();
          
          // Kayıt uri kontrolü
          if (!uri) {
            throw new Error('Ses kaydı URI alınamadı');
          }
          
          // Premium kontrolü
          if (!isPremium) {
            // Premium değilse uyarı göster ve premium sayfasına yönlendir
            Alert.alert(
              'Premium Özellik',
              'Sesli mesaj gönderebilmek için Premium üye olmanız gerekmektedir.',
              [
                { text: 'İptal', style: 'cancel' },
                { 
                  text: 'Premium Ol', 
                  onPress: () => navigation.navigate('PremiumScreen' as never) 
                }
              ]
            );
            return;
          }
          
          // Yükleme durumunu göster
          setIsUploading(true);
          setProgressMessage('Ses kaydı yükleniyor...');
          setUploadProgress(0);
          setIsProgressVisible(true);
          
          // Progress güncellemesi için interval
          let progress = 10;
          const progressInterval = setInterval(() => {
            progress += 10;
            if (progress <= 90) {
              setUploadProgress(progress);
            }
          }, 300);
          
          // Dosyayı FileSystem kullanarak okuyalım
          const fileInfo = await FileSystem.getInfoAsync(uri);
          const fileContent = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          // Supabase'e yükle - bucket adını değiştirdik: audiomessages
          const fileName = `audio_${Date.now()}.m4a`;
          const { data, error } = await supabase.storage
            .from('audiomessages')
            .upload(`${user.id}/${fileName}`, decode(fileContent), {
              contentType: 'audio/m4a',
              upsert: false
            });
            
          clearInterval(progressInterval);
          
          if (error) {
            throw error;
          }
          
          setUploadProgress(95);
          
          // Public URL al - bucket adını değiştirdik: audiomessages
          const { data: publicUrlData } = supabase.storage
            .from('audiomessages')
            .getPublicUrl(`${user.id}/${fileName}`);
          
          const audioUrl = publicUrlData.publicUrl;
          
          // Ses süresini formatla
          const formattedDuration = formatAudioDuration(recordingDuration);
          
          setUploadProgress(100);
          setProgressMessage('Ses kaydı başarıyla yüklendi! Gönderiliyor...');
          
          // Mesaj olarak gönder
          const metadata = {
            duration: formattedDuration,
            size: fileInfo.size,
            original_uri: uri
          };
          
          // Mesaj içeriği olarak "audio:" prefix'i ile URL'i gönderelim
          const audioContent = `audio:${audioUrl}`;
          const result = await sendMessage(audioContent, {
            type: 'audio',
            metadata: metadata
          });
          
          if (result) {
            // Mesaj kredisini düşür
            await decreaseMessageCredit();
          }
          
          // İlerleme modalını kapat
          setTimeout(() => {
            setIsProgressVisible(false);
            setIsUploading(false);
          }, 500);
        } catch (error) {
          console.error('Ses kaydı gönderilirken hata:', error);
          Alert.alert('Hata', 'Ses kaydı gönderilirken bir sorun oluştu.');
          setIsProgressVisible(false);
          setIsUploading(false);
        }
      } else {
        // Kayıt çok kısaysa veya iptal edildiyse
        await recordingInstance.stopAndUnloadAsync();
        if (cancel) {
          console.log('Ses kaydı iptal edildi');
        } else {
          Alert.alert('Bilgi', 'Ses kaydı çok kısa, lütfen daha uzun bir kayıt yapın.');
        }
      }
    } catch (error) {
      console.error('Ses kaydı durdurulurken hata:', error);
    } finally {
      // Temizlik
      setRecordingInstance(null);
      setIsRecording(false);
      setRecordingDuration(0);
    }
  };

  // Ses dosyasını çal/durdur
  const toggleAudioPlayback = async (messageId: string, audioUrl: string) => {
    try {
      // Oynatılmakta olan başka bir ses varsa durdur
      if (playingMessageId && playingMessageId !== messageId) {
        const currentSound = audioPlayback[playingMessageId];
        if (currentSound) {
          await currentSound.stopAsync().catch(() => {});
          setAudioProgress({...audioProgress, [playingMessageId]: 0});
        }
      }
      
      // Bu ses mesajı zaten oynatılıyorsa durdur
      if (playingMessageId === messageId) {
        const sound = audioPlayback[messageId];
        if (sound) {
          await sound.pauseAsync();
          setPlayingMessageId(null);
        }
        return;
      }
      
      // Ses henüz yüklenmemişse yükle
      let sound = audioPlayback[messageId];
      if (!sound) {
        // Ses modunu ayarla
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        
        // Sesi yükle
        const { sound: newSound, status } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          (status) => {
            // Update progress
            if (status.isLoaded) {
              const progress = status.positionMillis / status.durationMillis;
              setAudioProgress({...audioProgress, [messageId]: progress || 0});
              
              // Eğer oynatma bittiyse
              if (status.didJustFinish) {
                // İlerlemeyi sıfırla ama oynatıcıyı sıfırlama
                setAudioProgress({...audioProgress, [messageId]: 0});
                // Oynatma durumunu güncelle
                setPlayingMessageId(null);
              }
            }
          }
        );
        
        // Ses uzunluğunu kaydet
        if (status.isLoaded && status.durationMillis) {
          setAudioDuration({...audioDuration, [messageId]: status.durationMillis / 1000});
        }
        
        sound = newSound;
        setAudioPlayback({...audioPlayback, [messageId]: sound});
      } else {
        // Zaten yüklenmiş sesi oynat
        // Eğer ses bitmişse, baştan başlat
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (status.positionMillis >= status.durationMillis - 50) {
            await sound.setPositionAsync(0); // Başa sar
          }
          await sound.playAsync();
        } else {
          // Ses yüklenememişse, yeniden yükle
          await sound.unloadAsync();
          delete audioPlayback[messageId];
          // Yeniden recursion ile çağırarak yeniden yükle
          return toggleAudioPlayback(messageId, audioUrl);
        }
      }
      
      // Oynatılan mesaj ID'sini güncelle
      setPlayingMessageId(messageId);
    } catch (error) {
      console.error('Ses oynatılırken hata:', error);
      Alert.alert('Hata', 'Ses oynatılırken bir sorun oluştu.');
    }
  };

  // Ses süresi formatla (saniye -> MM:SS)
  const formatAudioDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    
    // Ondalık değeri yuvarlayalım
    const roundedSeconds = Math.round(seconds);
    const mins = Math.floor(roundedSeconds / 60);
    const secs = roundedSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Mesaj kuralları modalı için state
  const [showMessageRulesModal, setShowMessageRulesModal] = useState(false);
  const [hasSeenRules, setHasSeenRules] = useState(false);

  // Kullanıcının daha önce mesaj kurallarını görüp görmediğini kontrol et
  useEffect(() => {
    const checkMessageRulesSeen = async () => {
      if (!user?.id) return;
      
      try {
        const hasSeenKey = `message_rules_seen_${user.id}`;
        const hasSeenValue = await AsyncStorage.getItem(hasSeenKey);
        
        if (hasSeenValue === 'true') {
          setHasSeenRules(true);
        } else {
          // Kullanıcı daha önce kuralları görmemişse modalı göster
          setShowMessageRulesModal(true);
        }
      } catch (err) {
        console.error('Mesaj kuralları kontrolü yapılırken hata:', err);
      }
    };
    
    checkMessageRulesSeen();
  }, [user]);

  // Mesaj kurallarını onaylama işlemi
  const handleAcceptRules = async () => {
    if (!user?.id) return;
    
    try {
      const hasSeenKey = `message_rules_seen_${user.id}`;
      await AsyncStorage.setItem(hasSeenKey, 'true');
      setHasSeenRules(true);
      setShowMessageRulesModal(false);
    } catch (err) {
      console.error('Mesaj kuralları onayı kaydedilirken hata:', err);
    }
  };

  // Gönderme butonunu güncelle
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
      <LinearGradient
        colors={['#1A1A1A', '#121212']}
        style={styles.gradientBackground}
      >
        {/* Header - güncellendi */}
        <View style={[styles.statusBarArea, { height: insets.top }]} />
        <View style={styles.header}>
          {selectionMode ? (
            <>
              <TouchableOpacity style={styles.backButton} onPress={clearSelection}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{selectedMessages.length} mesaj seçildi</Text>
              </View>
              <TouchableOpacity style={styles.deleteButton} onPress={deleteSelectedMessages}>
                <MaterialCommunityIcons name="delete" size={24} color="#FF6B7D" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                <Ionicons name="chevron-back" size={24} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.userInfo} onPress={handleOpenUserProfile}>
                <Image source={{ uri: userAvatar }} style={styles.avatar} />
                <View style={styles.userTextInfo}>
                  <Text style={styles.userName}>{userName}</Text>
                  <Text style={styles.userStatus}>Çevrimiçi</Text>
                </View>
              </TouchableOpacity>
              
              {/* Arama Butonları */}
              <View style={styles.callButtonsContainer}>
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={() => handleCall('audio')}
                >
                  <MaterialCommunityIcons 
                    name="phone" 
                    size={22} 
                    color={isPremium ? "#64B5F6" : "#999"} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={() => handleCall('video')}
                >
                  <MaterialCommunityIcons 
                    name="video" 
                    size={22} 
                    color={isPremium ? "#4CAF50" : "#999"} 
                  />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
        
        <View style={styles.divider} />

        {/* SafeArea içinde kalan içerik ve alt kısım */}
        <View style={styles.safeArea}>
          {/* Loading durumu göster */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#128C7E" />
              <Text style={styles.loadingText}>Mesajlar yükleniyor...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={40} color="#FF6B7D" />
              <Text style={styles.errorText}>
                Mesajlar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.
              </Text>
            </View>
          ) : (
            /* Content - Kaydırılabilir */
            <View style={styles.contentContainer}>
              <FlatList
                ref={flatListRef}
                data={groupMessagesByDate()}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesContainer}
                showsVerticalScrollIndicator={false}
                inverted={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              />
            </View>
          )}

          {/* Hediye Gönder Butonu */}
          <View style={styles.giftButtonContainer}>
            <TouchableOpacity 
              style={styles.giftButton}
              onPress={handleShowGiftModal}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF6B7D', '#F3AC3D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.giftButtonGradient}
              >
                <View style={styles.giftButtonContent}>
                  <AntDesign name="gift" size={22} color="#FFF" style={styles.giftButtonIcon} />
                  <Text style={styles.giftButtonText}>Hediye Gönder</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Input Area - Sabit Kalacak */}
          <View style={styles.inputContainer}>
            {!isRecording ? (
              // Normal mesaj girişi - kayıt yapmıyorken
              <>
                <TouchableOpacity style={styles.attachButton} onPress={() => setShowOptions(true)}>
                  <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Mesaj"
                    placeholderTextColor="#999"
                    value={inputMessage}
                    onChangeText={setInputMessage}
                    multiline
                  />
                </View>
                {isUploading ? (
                  <View style={styles.sendButton}>
                    <ActivityIndicator size="small" color="#FFF" />
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.sendButton}
                    onPress={handleSendMessage}
                    onLongPress={startRecording}
                    onPressOut={() => isRecording && stopRecording()}
                    delayLongPress={300}
                  >
                    <MaterialCommunityIcons
                      name={inputMessage.trim() === '' ? 'microphone' : 'send'}
                      size={24}
                      color="#FFF"
                    />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              // Ses kaydı yapılırken WhatsApp benzeri arayüz
              <View style={styles.recordingContainer}>
                <TouchableOpacity 
                  style={styles.cancelRecordingButton}
                  onPress={() => stopRecording(true)}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#FFF" />
                  <Text style={styles.cancelRecordingText}>İptal</Text>
                </TouchableOpacity>
                
                <View style={styles.recordingInfoContainer}>
                  <View style={styles.recordingAnimation}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingTime}>
                      {formatAudioDuration(recordingDuration)}
                    </Text>
                  </View>
                  <Text style={styles.recordingHint}>
                    Kaydı bitirmek için parmağınızı kaldırın
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.sendRecordingButton}
                  onPress={() => stopRecording()}
                >
                  <MaterialCommunityIcons name="send" size={24} color="#FFF" />
                  <Text style={styles.sendRecordingText}>Gönder</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Seçenekler Modalı */}
        <Modal
          visible={showOptions}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowOptions(false)}
        >
          <TouchableOpacity 
            style={styles.bottomModalOverlay}
            activeOpacity={1}
            onPress={() => setShowOptions(false)}
          >
            <View style={[styles.optionsContainer, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seçenekler</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowOptions(false)}
                >
                  <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setShowOptions(false);
                  setTimeout(() => {
                    console.log('Galeri butonu tıklandı');
                    pickImageFromLibrary();
                  }, 300);
                }}
                disabled={isPickerActive || isUploading}
              >
                <View style={[
                  styles.optionIcon, 
                  { backgroundColor: isPickerActive || isUploading ? '#666' : '#9C27B0' }
                ]}>
                  {isPickerActive ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="images" size={24} color="#FFF" />
                  )}
                </View>
                <Text style={[
                  styles.optionText,
                  isPickerActive || isUploading ? { color: '#999' } : {}
                ]}>
                  {isPickerActive ? 'İşlem devam ediyor...' : 'Galeriden Seç'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setShowOptions(false);
                  handleShowGiftModal();
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#F3AC3D' }]}>
                  <FontAwesome5 name="gift" size={20} color="#FFF" />
                </View>
                <Text style={styles.optionText}>Hediye</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Yükleme İlerleme Göstergesi Modalı */}
        <Modal
          visible={isProgressVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.progressModalOverlay}>
            <View style={styles.progressModalContainer}>
              <View style={styles.progressHeader}>
                <MaterialCommunityIcons name="cloud-upload" size={28} color="#64B5F6" />
                <Text style={styles.progressTitle}>Fotoğraf Yükleniyor</Text>
              </View>
              
              <Text style={styles.progressPercentText}>%{Math.round(uploadProgress)}</Text>
              
              <View style={styles.progressBarContainer}>
                {Platform.OS === 'android' ? (
                  <ProgressBarAndroid
                    styleAttr="Horizontal"
                    indeterminate={false}
                    progress={uploadProgress / 100}
                    color="#64B5F6"
                    style={styles.progressBar}
                  />
                ) : (
                  <ProgressBar 
                    progress={uploadProgress / 100}
                    color="#64B5F6" 
                  />
                )}
              </View>
              
              <Text style={styles.progressMessage}>{progressMessage}</Text>
              
              <ActivityIndicator size="small" color="#64B5F6" style={styles.progressSpinner} />
            </View>
          </View>
        </Modal>

        {/* Tam Ekran Görüntüleme Modal'ı */}
        <Modal
          visible={isFullscreenVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsFullscreenVisible(false)}
        >
          <View style={styles.fullscreenModal}>
            <TouchableOpacity 
              style={styles.fullscreenCloseButton} 
              onPress={() => setIsFullscreenVisible(false)}
            >
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            
            <View style={styles.fullscreenImageContainer}>
              <TouchableOpacity
                activeOpacity={1}
                style={styles.fullscreenTouchable}
                onPress={() => setIsFullscreenVisible(false)}
              >
                <Image
                  source={{ uri: fullscreenImageUri }}
                  style={[
                    styles.fullscreenImage,
                    { transform: [{ scale: imageScale }] }
                  ]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.fullscreenControls}>
              <TouchableOpacity 
                style={styles.zoomButton}
                onPress={() => setImageScale(prev => Math.max(1, prev - 0.5))}
              >
                <MaterialCommunityIcons name="minus" size={24} color="#FFF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.zoomButton}
                onPress={() => setImageScale(prev => Math.min(3, prev + 0.5))}
              >
                <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Hediye Seçme Modalı */}
        <Modal
          visible={showGiftModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowGiftModal(false)}
        >
          <View style={styles.bottomModalOverlay}>
            <View style={[styles.giftModalContainer, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Hediye Gönder</Text>
                <View style={styles.headerRightContainer}>
                  <View style={styles.creditInfoContainer}>
                    <Text style={styles.userCreditText}>Krediniz: {userCredit}</Text>
                    <TouchableOpacity 
                      style={styles.loadCreditButton}
                      onPress={() => {
                        setShowGiftModal(false);
                        // ConsumablesShopScreen'e yönlendir ve credit sekmesini, gift_credit alt sekmesini seç
                        navigation.navigate('ConsumablesShopScreen', { initialTab: 'credit', subTab: 'gift_credit' } as never);
                      }}
                    >
                      <Text style={styles.loadCreditButtonText}>Kredi Yükle</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setShowGiftModal(false)}
                  >
                    <Ionicons name="close" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
              
              {isLoadingGifts ? (
                <View style={styles.loadingGiftsContainer}>
                  <ActivityIndicator size="large" color="#FF6B7D" />
                  <Text style={styles.loadingText}>Hediyeler yükleniyor...</Text>
                </View>
              ) : (
                <>
                  <ScrollView 
                    style={styles.giftsScrollView}
                    contentContainerStyle={styles.giftsContainer}
                  >
                    {gifts.map(gift => (
                      <TouchableOpacity
                        key={gift.id}
                        style={[
                          styles.giftItem,
                          selectedGift?.id === gift.id && styles.selectedGiftItem,
                          userCredit < gift.credit_value && styles.disabledGiftItem
                        ]}
                        onPress={() => handleSelectGift(gift)}
                        disabled={userCredit < gift.credit_value}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.giftItemEmoji}>
                          {getGiftEmoji(gift.name)}
                        </Text>
                        <Text style={styles.giftItemName}>{gift.name}</Text>
                        <Text style={[
                          styles.giftItemCredit,
                          userCredit < gift.credit_value && styles.insufficientCreditText
                        ]}>
                          {gift.credit_value} kredi
                        </Text>

                        {selectedGift?.id === gift.id && (
                          <View style={styles.selectedGiftIndicator}>
                            <AntDesign name="checkcircle" size={20} color="#4CAF50" />
                          </View>
                        )}
                        
                        {userCredit < gift.credit_value && (
                          <View style={styles.insufficientCreditBadge}>
                            <Text style={styles.insufficientCreditBadgeText}>Yetersiz Kredi</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  
                  <View style={styles.giftModalActions}>
                    <TouchableOpacity
                      style={[styles.cancelGiftButton, {flex: 1}]}
                      onPress={() => setShowGiftModal(false)}
                    >
                      <Text style={styles.cancelGiftButtonText}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.sendGiftButton,
                        (!selectedGift || isSendingGift) && styles.disabledSendGiftButton,
                        {flex: 2}
                      ]}
                      onPress={handleSendGift}
                      disabled={!selectedGift || isSendingGift}
                    >
                      {isSendingGift ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.sendGiftButtonText}>
                          {selectedGift 
                            ? `${selectedGift.name} Gönder (${selectedGift.credit_value} kredi)` 
                            : 'Hediye Seçin'
                          }
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Görüşme Modalı */}
        <Modal
          visible={showCallModal}
          transparent={true}
          animationType="slide"
          onRequestClose={handleEndCall}
        >
          <View style={styles.callModalContainer}>
            <LinearGradient
              colors={callType === 'video' ? ['#1A1A1A', '#121212'] : ['#128C7E', '#075E54']}
              style={[styles.callModalContent, { paddingTop: insets.top }]}
            >
              {/* Kullanıcı Bilgileri */}
              <View style={styles.callUserInfo}>
                <Image 
                  source={{ uri: userAvatar }} 
                  style={[
                    styles.callUserImage,
                    callType === 'video' && isCameraOn && styles.callUserSmallImage
                  ]} 
                />
                <Text style={styles.callUserName}>{userName}</Text>
                <Text style={styles.callStatus}>
                  {callStatus === 'ringing' ? 'Aranıyor...' : 
                   callStatus === 'connected' ? 'Bağlandı' : 'Arama Sonlandırıldı'}
                </Text>
              </View>
              
              {/* Görüntülü Görüşme Kamera Önizleme */}
              {callType === 'video' && isCameraOn && (
                <View style={styles.cameraPreviewContainer}>
                  <View style={styles.cameraPreview}>
                    {/* Kamera önizleme sahte view */}
                  </View>
                </View>
              )}
              
              {/* Arama Kontrolleri */}
              <View style={[
                styles.callControls,
                callType === 'video' 
                  ? { maxWidth: '95%' } 
                  : { maxWidth: '85%' }
              ]}>
                {callType === 'audio' ? (
                  <>
                    <TouchableOpacity 
                      style={[styles.callControlButton, !isMicOn && styles.callControlButtonOff]}
                      onPress={toggleMic}
                    >
                      <MaterialCommunityIcons 
                        name={isMicOn ? "microphone" : "microphone-off"} 
                        size={24} 
                        color="#FFF" 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.callControlButton, isSpeakerOn && styles.callControlButtonOn]}
                      onPress={toggleSpeaker}
                    >
                      <MaterialCommunityIcons 
                        name={isSpeakerOn ? "volume-high" : "phone-in-talk"} 
                        size={24} 
                        color="#FFF" 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.endCallButtonNew}
                      onPress={handleEndCall}
                    >
                      <MaterialCommunityIcons name="phone-hangup" size={24} color="#FFF" />
                      <Text style={styles.endCallButtonText}>Kapat</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity 
                      style={[styles.callControlButton, !isMicOn && styles.callControlButtonOff]}
                      onPress={toggleMic}
                    >
                      <MaterialCommunityIcons 
                        name={isMicOn ? "microphone" : "microphone-off"} 
                        size={24} 
                        color="#FFF" 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.callControlButton, !isCameraOn && styles.callControlButtonOff]}
                      onPress={toggleCamera}
                    >
                      <MaterialCommunityIcons 
                        name={isCameraOn ? "camera" : "camera-off"} 
                        size={24} 
                        color="#FFF" 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.callControlButton, isSpeakerOn && styles.callControlButtonOn]}
                      onPress={toggleSpeaker}
                    >
                      <MaterialCommunityIcons 
                        name={isSpeakerOn ? "volume-high" : "phone-in-talk"} 
                        size={24} 
                        color="#FFF" 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.endCallButtonNew}
                      onPress={handleEndCall}
                    >
                      <MaterialCommunityIcons name="phone-hangup" size={24} color="#FFF" />
                      <Text style={styles.endCallButtonText}>Kapat</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </LinearGradient>
          </View>
        </Modal>

        {/* Profil Detay Modal */}
        <Modal
          visible={showProfileDetail}
          transparent={true}
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setShowProfileDetail(false)}
        >
          <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.8)" />
          <View style={styles.modalContainer}>
            <View style={styles.profileDetailContainer}>
              {/* Üst Başlık */}
              <View style={[
                styles.profileDetailHeader, 
                { paddingTop: insets.top + SPACING.md }
              ]}>
                <View style={styles.profileNameContainer}>
                  <Text style={styles.profileDetailName}>{profileUser?.first_name || userName}</Text>
                  <Text style={styles.profileDetailAge}>, {userAge || ''}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowProfileDetail(false)}
                >
                  <MaterialCommunityIcons name="chevron-down" size={30} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.profileDetailContent} showsVerticalScrollIndicator={false}>
                {/* Fotoğraflar */}
                <View style={styles.profilePhotosContainer}>
                  <ScrollView 
                    horizontal 
                    pagingEnabled 
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(event) => {
                      const slideWidth = SCREEN_WIDTH;
                      const currentIndex = Math.floor(event.nativeEvent.contentOffset.x / slideWidth);
                      setProfileDetailPhotoIndex(currentIndex);
                    }}
                  >
                    {(profileUser?.photos && profileUser.photos.length > 0) ? (
                      profileUser.photos.map((photo: string, index: number) => (
                        <Image 
                          key={index} 
                          source={{ uri: photo }} 
                          style={styles.profileDetailPhoto}
                          resizeMode="cover"
                        />
                      ))
                    ) : (
                      <Image 
                        source={{ uri: userAvatar }} 
                        style={styles.profileDetailPhoto}
                        resizeMode="cover"
                      />
                    )}
                  </ScrollView>
                  
                  {/* Fotoğraf indikatörleri */}
                  {profileUser?.photos && profileUser.photos.length > 1 && (
                    <View style={styles.photoIndicatorsContainer}>
                      {profileUser.photos.map((_: string, index: number) => (
                        <View 
                          key={index} 
                          style={[
                            styles.photoIndicator, 
                            profileDetailPhotoIndex === index && styles.photoIndicatorActive
                          ]} 
                        />
                      ))}
                    </View>
                  )}
                </View>

                {/* İlgi Alanları - Hobiler */}
                <View style={styles.profileSection}>
                  <Text style={styles.profileSectionTitle}>İlgi Alanları</Text>
                  <View style={styles.profileInterests}>
                    {profileUser?.interests && profileUser.interests.length > 0 ? (
                      profileUser.interests.map((interest: string, index: number) => (
                        <View key={index} style={styles.profileInterestTag}>
                          <Text style={styles.profileInterestText}>{interest}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noDataText}>Henüz ilgi alanları eklenmemiş.</Text>
                    )}
                  </View>
                </View>

                {/* Biyografi */}
                <View style={styles.profileSection}>
                  <Text style={styles.profileSectionTitle}>Hakkında</Text>
                  <Text style={styles.profileBio}>
                    {profileUser?.biography || "Kullanıcı henüz kendisi hakkında bilgi eklememiş."}
                  </Text>
                </View>

                {/* Butonlar */}
                <View style={styles.profileButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.messageSendButton}
                    onPress={() => {
                      // Zaten mesajlaşma ekranındayız, sadece modalı kapat
                      setShowProfileDetail(false);
                    }}
                  >
                    <Text style={styles.messageSendButtonText}>Sohbete Dön</Text>
                  </TouchableOpacity>

                  <View style={styles.secondaryButtonsContainer}>
                    <TouchableOpacity 
                      style={styles.secondaryButton}
                      onPress={handleToggleBlockUser}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {isUserBlocked ? 'Engeli Kaldır' : 'Engelle'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.secondaryButton}
                      onPress={() => console.log(`Raporla: ${profileUser?.first_name || userName}`)}
                    >
                      <Text style={styles.secondaryButtonText}>Raporla</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Özel uyarı modalı */}
        {showCustomAlert && (
          <View style={styles.customAlertContainer}>
            <Animated.View 
              style={[
                styles.customAlertBox, 
                {
                  opacity: alertOpacity,
                  transform: [{ scale: alertScale }]
                }
              ]}
            >
              <MaterialCommunityIcons name="phone-off" size={36} color="#FF6B7D" />
              <Text style={styles.customAlertTitle}>Arama Sonlandırıldı</Text>
              <Text style={styles.customAlertMessage}>Karşı üye görüşmeye uygun değil.</Text>
            </Animated.View>
          </View>
        )}

        {/* Mesaj Kredisi Yok Modalı */}
        <Modal
          visible={showNoCreditModal}
          transparent={true}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setShowNoCreditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.noCreditModalContainer}>
              <View style={styles.noCreditModalHeader}>
                <MaterialCommunityIcons name="message-alert" size={40} color="#FF6B7D" />
                <Text style={styles.noCreditModalTitle}>Mesaj Krediniz Yok</Text>
                <Text style={styles.noCreditModalMessage}>
                  Şu anda mesaj krediniz yok. Mesajlaşmaya devam etmek için lütfen kredi alın.
                </Text>
              </View>

              <View style={styles.noCreditModalButtons}>
                <TouchableOpacity 
                  style={styles.noCreditModalCloseButton} 
                  onPress={() => setShowNoCreditModal(false)}
                >
                  <Text style={styles.noCreditModalCloseText}>Kapat</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.noCreditModalBuyButton} 
                  onPress={() => {
                    setShowNoCreditModal(false);
                    // ConsumablesShopScreen'e yönlendir ve credit sekmesini, message_credit alt sekmesini seç
                    navigation.navigate('ConsumablesShopScreen', { initialTab: 'credit', subTab: 'message_credit' } as never);
                  }}
                >
                  <Text style={styles.noCreditModalBuyText}>Kredi Al</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Mesaj Kuralları Modalı */}
        <Modal
          visible={showMessageRulesModal}
          transparent={true}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setShowMessageRulesModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.rulesModalContainer}>
              <View style={styles.rulesModalHeader}>
                <MaterialCommunityIcons name="message-alert" size={40} color="#FF6B7D" />
                <Text style={styles.rulesModalTitle}>Lovla Mesaj Kuralları</Text>
              </View>

              <ScrollView style={styles.rulesModalContent}>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleNumber}>1</Text>
                  <Text style={styles.ruleText}>
                    Karşınızdaki kişiye karşı saygılı olun. Sistemimiz yapay zeka ile mesajların içeriğini kontrol eder ve saygı çerçevesi dışındaki mesajları engeller, bu hesabınızın engellenmesine neden olabilir.
                  </Text>
                </View>
                
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleNumber}>2</Text>
                  <Text style={styles.ruleText}>
                    İletişim bilgisi paylaşmayın. Sistemimiz yapay zeka ile telefon numarası, sosyal medya hesapları gibi bilgilerin paylaşıldığı mesajları sürekli denetler. Bu şekilde bir mesaj göndermeniz halinde mesajınız alıcıya ulaşmaz ve hesabınız kapatılır.
                  </Text>
                </View>
                
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleNumber}>3</Text>
                  <Text style={styles.ruleText}>
                    Rahatsız edici davranışlarda bulunmayın. Taciz ve zorbalık kesinlikle yasaktır.
                  </Text>
                </View>
              </ScrollView>

              <TouchableOpacity 
                style={styles.acceptRulesButton} 
                onPress={handleAcceptRules}
              >
                <Text style={styles.acceptRulesButtonText}>Anladım ve Onaylıyorum</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  gradientBackground: {
    flex: 1,
  },
  statusBarArea: {
    backgroundColor: '#1A1A1A',
    width: '100%',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1A1A1A',
    height: 60,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  backText: {
    color: '#FFF',
    fontSize: 16,
    marginLeft: 5,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userTextInfo: {
    flex: 1,
  },
  userName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userStatus: {
    color: '#BBB',
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FFF',
    textAlign: 'center',
    marginTop: 10,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 10,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: Dimensions.get('window').width * 0.8,
  },
  myMessageBubble: {
    backgroundColor: '#128C7E',
    borderTopRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#333',
    borderTopLeftRadius: 4,
  },
  messageSender: {
    color: '#64B5F6',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  messageText: {
    color: '#FFF',
    fontSize: 16,
  },
  messageTimestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestampText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginRight: 4,
  },
  infoMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  infoMessageText: {
    color: '#BBB',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 8,
    width: Dimensions.get('window').width * 0.7,
  },
  audioAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#128C7E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  audioWaveContainer: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
  },
  audioWave: {
    height: 20,
    backgroundColor: '#555',
    borderRadius: 2,
    // Ses dalgası için birden fazla çizgi eklenebilir
  },
  audioDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  audioDuration: {
    color: '#FFF',
    fontSize: 12,
    marginRight: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    backgroundColor: '#1A1A1A',
    borderTopColor: '#333',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachButton: {
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 20,
    marginHorizontal: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    color: '#FFF',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#128C7E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginVertical: 4,
  },
  imageMessageContainer: {
    position: 'relative',
    marginVertical: 4,
  },
  imageFullscreenButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    backgroundColor: '#2A2A2A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(50,50,50,0.5)',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 5,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionText: {
    color: '#FFF',
    fontSize: 16,
  },
  selectedMessageBubble: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  selectedCheckmark: {
    position: 'absolute',
    right: -10,
    top: -5,
    backgroundColor: '#121212',
    borderRadius: 10,
    padding: 2,
  },
  deleteButton: {
    padding: 10,
  },
  // Tam ekran görüntüleme için yeni stiller
  fullscreenModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
  fullscreenControls: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  // İlerleme göstergesi için stiller
  progressModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressModalContainer: {
    width: '80%',
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  progressTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  progressPercentText: {
    color: '#64B5F6',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  progressBarContainer: {
    width: '100%',
    marginVertical: 10,
  },
  progressBar: {
    width: '100%',
    height: 8,
  },
  customProgressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  customProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressMessage: {
    color: '#CCC',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  progressSpinner: {
    marginTop: 15,
  },
  giftButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1A1A1A',
  },
  giftButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  giftButtonGradient: {
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  giftButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftButtonIcon: {
    marginRight: 8,
  },
  giftButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  // Hediye modal stilleri
  giftModalContainer: {
    backgroundColor: '#2A2A2A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  creditInfoContainer: {
    alignItems: 'flex-end',
  },
  userCreditText: {
    color: '#FFF',
    marginBottom: 5,
  },
  loadCreditButton: {
    backgroundColor: 'rgba(255,107,125,0.3)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,125,0.5)',
  },
  loadCreditButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  giftsScrollView: {
    maxHeight: 400,
  },
  giftsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  giftItem: {
    width: '30%',
    aspectRatio: 0.9,
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    position: 'relative',
    overflow: 'hidden',
  },
  selectedGiftItem: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#2D3B2D',
  },
  disabledGiftItem: {
    opacity: 0.6,
  },
  giftItemEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  giftItemName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  giftItemCredit: {
    color: '#FFD54F',
    fontSize: 12,
    marginTop: 4,
  },
  insufficientCreditText: {
    color: '#FF6B7D',
  },
  insufficientCreditBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 107, 125, 0.8)',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    transform: [{ rotate: '45deg' }],
  },
  insufficientCreditBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  selectedGiftIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 2,
  },
  loadingGiftsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  giftModalActions: {
    flexDirection: 'row',
    marginTop: 10,
  },
  cancelGiftButton: {
    backgroundColor: '#444',
    padding: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelGiftButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  sendGiftButton: {
    backgroundColor: '#FF6B7D',
    padding: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  disabledSendGiftButton: {
    backgroundColor: '#666',
  },
  sendGiftButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  // Hediye mesajı stilleri
  giftMessageBubble: {
    overflow: 'hidden',
    borderRadius: 16,
    maxWidth: Dimensions.get('window').width * 0.8,
  },
  giftGradient: {
    padding: 12,
    borderRadius: 16,
  },
  giftEmojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 10,
  },
  giftEmoji: {
    fontSize: 50,
    textAlign: 'center',
  },
  giftText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 8,
  },
  giftValueContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'center',
    marginTop: 4,
  },
  giftValueText: {
    color: '#FFD54F',
    fontSize: 12,
    fontWeight: '600',
  },
  callButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  callModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  callModalContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  callUserInfo: {
    alignItems: 'center',
    marginTop: 60,
  },
  callUserImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  callUserSmallImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  callUserName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  callStatus: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  cameraPreviewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  cameraPreview: {
    width: '100%',
    height: 400,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
  },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 12,
    paddingHorizontal: 25, // 10'dan 25'e çıkardım
    borderRadius: 40, // 16'dan 40'a çıkardım - daha oval görünüm için
    marginBottom: 20,
    gap: 15,
    alignSelf: 'center',
    width: 'auto',
  },
  callControlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60, // Biraz küçülttüm
    height: 60, // Biraz küçülttüm
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  callControlButtonOff: {
    backgroundColor: '#E53935',
  },
  callControlButtonOn: {
    backgroundColor: '#4CAF50',
  },
  endCallButtonNew: {
    backgroundColor: '#E53935',
    flexDirection: 'row',
    padding: 10, // 12'den 10'a düşürdüm
    paddingHorizontal: 20,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 130, // Minimum genişlik ekledim
  },
  endCallButtonText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  callControlText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 5,
  },
  // Profil modalı için stiller
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  profileDetailContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  profileDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    zIndex: 10,
    elevation: 5,
  },
  profileNameContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  profileDetailName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileDetailAge: {
    fontSize: 22,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  profileDetailContent: {
    flex: 1,
  },
  profilePhotosContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#000',
  },
  profileDetailPhoto: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  photoIndicatorsContainer: {
    position: 'absolute',
    bottom: SPACING.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  photoIndicator: {
    width: 40,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 2,
  },
  photoIndicatorActive: {
    backgroundColor: '#FF4B7E',
  },
  profileSection: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  profileSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: SPACING.sm,
  },
  profileInterests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  profileInterestTag: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(80,80,80,0.5)',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  profileInterestText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  profileBio: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
  noDataText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  profileButtonsContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl * 3, // Alt çubuk için ekstra alan bırak
  },
  messageSendButton: {
    backgroundColor: '#FF4B7E',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  messageSendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  customAlertContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  customAlertBox: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 30,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  customAlertTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
  },
  customAlertMessage: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noCreditModalContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
  },
  noCreditModalHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  noCreditModalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  noCreditModalMessage: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  noCreditModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  noCreditModalCloseButton: {
    backgroundColor: '#444',
    padding: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    width: '48%',
  },
  noCreditModalCloseText: {
    color: '#FFF',
    fontWeight: '600',
  },
  noCreditModalBuyButton: {
    backgroundColor: '#FF6B7D',
    padding: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    width: '48%',
  },
  noCreditModalBuyText: {
    color: '#FFF',
    fontWeight: '600',
  },
  // Ekle - Altta görünecek modallar için yeni stil
  bottomModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  recordingButton: {
    backgroundColor: '#E53935',
  },
  recordingIndicator: {
    position: 'absolute',
    top: -40,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
    marginRight: 8,
  },
  recordingTime: {
    color: '#FFF',
    fontSize: 12,
  },
  pauseButton: {
    backgroundColor: '#E53935',
  },
  audioWaveContainer: {
    flex: 1,
    height: 30,
    position: 'relative',
    justifyContent: 'center',
  },
  audioWaveBackground: {
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    width: '100%',
  },
  audioWaveProgress: {
    position: 'absolute',
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 2,
  },
  // Kayıt arayüzü için yeni stiller
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    borderRadius: 25,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  cancelRecordingText: {
    color: '#FFF',
    marginLeft: 4,
    fontSize: 14,
  },
  recordingInfoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingAnimation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sendRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#128C7E',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendRecordingText: {
    color: '#FFF',
    marginLeft: 4,
    fontSize: 14,
  },
  // Mesaj Kuralları Modalı Stilleri
  rulesModalContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    elevation: 10,
  },
  rulesModalHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  rulesModalTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  rulesModalContent: {
    width: '100%',
    maxHeight: 400,
  },
  ruleItem: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  ruleNumber: {
    color: '#FF6B7D',
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 10,
    width: 30,
    textAlign: 'center',
  },
  ruleText: {
    color: '#FFF',
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  acceptRulesButton: {
    backgroundColor: '#FF6B7D',
    padding: 15,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  acceptRulesButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  missedCallContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  missedCallText: {
    color: '#FF5252',
    fontSize: 14,
    marginLeft: 5,
  },
  infoMessageTimestamp: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  imageLoadingContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 1,
  },
}); 