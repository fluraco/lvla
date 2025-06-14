import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Text,
  Dimensions,
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  ScrollView,
  StatusBar,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  useAnimatedGestureHandler,
  withSequence,
  withDelay,
  interpolate,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  TapGestureHandler,
  LongPressGestureHandler,
  State,
} from 'react-native-gesture-handler';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { AntDesign } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveUserInteraction, checkForMatch } from '../../services/interaction';
import { useUser } from '../../contexts/UserContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.62;
const STORY_DURATION = 15000; // 15 saniye

// Kaydırma eşik değerleri
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4;
const SUPER_LIKE_THRESHOLD = SCREEN_HEIGHT * 0.2;

// Animasyon değerleri
const MAX_ACTION_OPACITY = 0.9;

interface UserCardProps {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    birth_date: string;
    photos?: string[];
    biography: string;
    interests?: string[];
    location: {
      city: string;
      country: string;
    };
  };
  isFirst: boolean;
  swipeRef: any;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeTop: () => void;
  onSwipeDown?: () => void;
  onInteraction?: () => Promise<void>;
}

// UserCard bileşenini forwardRef ile sarmalayarak ref özelliği ekledik
export const UserCard = forwardRef(({
  user,
  isFirst,
  swipeRef,
  onSwipeLeft,
  onSwipeRight,
  onSwipeTop,
  onSwipeDown,
  onInteraction,
}: UserCardProps, ref) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showFullBio, setShowFullBio] = useState(false);
  const [bioExceedsMaxLines, setBioExceedsMaxLines] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showProfileDetail, setShowProfileDetail] = useState(false);
  const [profileDetailPhotoIndex, setProfileDetailPhotoIndex] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedBy, setIsBlockedBy] = useState(false);
  const [isLoadingBlock, setIsLoadingBlock] = useState(false);
  const bioTextRef = useRef(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardRotate = useSharedValue(0);
  const scale = useSharedValue(isFirst ? 1 : 0.92);
  const cardOpacity = useSharedValue(isFirst ? 1 : 0.8);
  const cardElevation = useSharedValue(isFirst ? 2 : 1);
  const progressAnim = useSharedValue(0);
  const animationStartTime = useRef<number | null>(null);
  const animationProgress = useRef<number>(0);
  const timerId = useRef<NodeJS.Timeout | null>(null);
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useUser();
  const route = useRoute();
  const navigation = useNavigation();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');

  // Fotoğrafları güvenli bir şekilde al
  const photos = user.photos || [];
  const currentPhoto = photos[currentPhotoIndex] || 'https://via.placeholder.com/400x600?text=No+Photo';

  // Kullanıcı değiştiğinde biyografi görünümünü sıfırla
  useEffect(() => {
    setShowFullBio(false);
    setBioExceedsMaxLines(false);
    setCurrentPhotoIndex(0);
    progressAnim.value = 0;
    animationProgress.current = 0;
  }, [user.id]);

  // İlk kart olmadığında değerleri ayarla
  useEffect(() => {
    if (!isFirst) {
      translateX.value = 0;
      translateY.value = 12; // Hafif aşağıda konumlandır
      cardRotate.value = 0;
      scale.value = 0.92;
      cardOpacity.value = 0.8;
      cardElevation.value = 1;
    } else {
      scale.value = 1;
      cardOpacity.value = 1;
      cardElevation.value = 2;
    }
    
    return () => clearTimeout(timerId.current);
  }, [isFirst]);

  // Otomatik fotoğraf geçişi - fotoğraf değiştiğinde veya kart ilk olduğunda yeniden başlat
  useEffect(() => {
    if (isFirst && photos.length > 1) {
      startStoryTimer();
    }
    
    return () => {
      clearStoryTimer();
    };
  }, [currentPhotoIndex, isFirst]);

  // isPaused değiştiğinde zamanlayıcıyı duraklat veya devam ettir
  useEffect(() => {
    if (isFirst && photos.length > 1) {
      if (isPaused) {
        pauseStoryTimer();
      } else {
        resumeStoryTimer();
      }
    }
  }, [isPaused]);

  // Kullanıcı basılı tuttuğunda
  const handlePressIn = () => {
    if (isFirst && photos.length > 1) {
      setIsPaused(true);
    }
  };

  // Kullanıcı parmağını kaldırdığında
  const handlePressOut = () => {
    if (isFirst && photos.length > 1) {
      setIsPaused(false);
    }
  };

  // Basılı tutma olayını ele alma
  const onLongPressStateChange = (event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      handlePressIn();
    } else if (event.nativeEvent.state === State.END || 
               event.nativeEvent.state === State.CANCELLED || 
               event.nativeEvent.state === State.FAILED) {
      handlePressOut();
    }
  };

  // Zamanlayıcıyı başlat
  const startStoryTimer = () => {
    if (!isFirst || photos.length <= 1) return;

    clearStoryTimer();
    
    // Eğer durdurulmuşsa, başlatma
    if (isPaused) return;
    
    animationStartTime.current = Date.now();
    animationProgress.current = 0;
    
    // Progress animasyonunu başlat
    progressAnim.value = 0;
    progressAnim.value = withTiming(1, {
      duration: STORY_DURATION,
      easing: Easing.linear,
    });
    
    // Süre sonunda sonraki fotoğrafa geçiş
    timerId.current = setTimeout(() => {
      if (currentPhotoIndex < photos.length - 1) {
        setCurrentPhotoIndex(prev => prev + 1);
      } else {
        // Son fotoğraftan sonra başa dön
        setCurrentPhotoIndex(0);
      }
    }, STORY_DURATION);
  };

  const pauseStoryTimer = () => {
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
    
    // Mevcut ilerlemeyi kaydet
    if (animationStartTime.current) {
      const elapsedTime = Date.now() - animationStartTime.current;
      animationProgress.current = Math.min(elapsedTime / STORY_DURATION, 1);
    }
    
    // Animasyonu durdur
    cancelAnimation(progressAnim);
  };

  const resumeStoryTimer = () => {
    if (!isFirst || photos.length <= 1) return;
    
    // Kalan süreyi hesapla
    const remainingTime = STORY_DURATION * (1 - animationProgress.current);
    
    if (remainingTime <= 0) {
      // Süre dolmuşsa sonraki fotoğrafa geç
      if (currentPhotoIndex < photos.length - 1) {
        setCurrentPhotoIndex(prev => prev + 1);
      } else {
        setCurrentPhotoIndex(0);
      }
      return;
    }
    
    // İlerleme animasyonuna kaldığı yerden devam et
    progressAnim.value = withTiming(1, {
      duration: remainingTime,
      easing: Easing.linear,
    });
    
    // Zamanlayıcıyı kalan süreyle yeniden başlat
    timerId.current = setTimeout(() => {
      if (currentPhotoIndex < photos.length - 1) {
        setCurrentPhotoIndex(prev => prev + 1);
      } else {
        setCurrentPhotoIndex(0);
      }
    }, remainingTime);
    
    // Başlangıç zamanını güncelle
    animationStartTime.current = Date.now() - (STORY_DURATION * animationProgress.current);
  };

  const clearStoryTimer = () => {
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
  };

  // İlgi alanları
  const interests = user.interests || [];

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const nextPhoto = () => {
    clearStoryTimer();
    if (currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    } else {
      // Son fotoğrafta tekrar başa dön
      setCurrentPhotoIndex(0);
    }
  };

  const previousPhoto = () => {
    clearStoryTimer();
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  };

  // Biyografi metninin satır sayısını kontrol et
  const checkBioLength = (event) => {
    if (event.nativeEvent) {
      const { lines } = event.nativeEvent;
      setBioExceedsMaxLines(lines && lines.length > 3);
    }
  };

  // Kaydırma animasyonu ve göstergeleri için değişkenler
  const likeOpacity = useSharedValue(0);
  const dislikeOpacity = useSharedValue(0);
  const superLikeOpacity = useSharedValue(0);
  const messageOpacity = useSharedValue(0);
  
  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: (_, context: any) => {
      context.startX = translateX.value;
      context.startY = translateY.value;
    },
    onActive: (event, context) => {
      translateX.value = context.startX + event.translationX;
      translateY.value = context.startY + event.translationY;
      cardRotate.value = translateX.value / 10;
      
      // Kaydırma göstergeleri için opaklık değerlerini hesapla
      if (translateX.value > 0) {
        // Sağa kaydırma (Beğen/Like)
        likeOpacity.value = interpolate(
          translateX.value,
          [0, SWIPE_THRESHOLD],
          [0, MAX_ACTION_OPACITY],
          { extrapolateRight: 'clamp' }
        );
        
        dislikeOpacity.value = 0;
        superLikeOpacity.value = 0;
        messageOpacity.value = 0;
      } else if (translateX.value < 0) {
        // Sola kaydırma (Beğenme/Dislike)
        dislikeOpacity.value = interpolate(
          Math.abs(translateX.value),
          [0, SWIPE_THRESHOLD],
          [0, MAX_ACTION_OPACITY],
          { extrapolateRight: 'clamp' }
        );
        
        likeOpacity.value = 0;
        superLikeOpacity.value = 0;
        messageOpacity.value = 0;
      } else {
        likeOpacity.value = 0;
        dislikeOpacity.value = 0;
      }

      // Yukarı kaydırma (Süper Beğeni/Super Like)
      if (translateY.value < 0) {
        superLikeOpacity.value = interpolate(
          Math.abs(translateY.value),
          [0, SUPER_LIKE_THRESHOLD],
          [0, MAX_ACTION_OPACITY],
          { extrapolateRight: 'clamp' }
        );
        // Yatay kaydırma varsa süper beğeni göstergesini bastır
        if (Math.abs(translateX.value) > 50) {
          superLikeOpacity.value = 0;
        }
        if (Math.abs(translateY.value) > 50) {
          likeOpacity.value = 0;
          dislikeOpacity.value = 0;
        }
        messageOpacity.value = 0;
      } else if (translateY.value > 0) {
        // Aşağı kaydırma (Mesaj gönderme)
        messageOpacity.value = interpolate(
          translateY.value,
          [0, SUPER_LIKE_THRESHOLD],
          [0, MAX_ACTION_OPACITY],
          { extrapolateRight: 'clamp' }
        );
        // Yatay kaydırma varsa mesaj göstergesini bastır
        if (Math.abs(translateX.value) > 50) {
          messageOpacity.value = 0;
        }
        // Diğer göstergeleri kapat
        if (translateY.value > 50) {
          likeOpacity.value = 0;
          dislikeOpacity.value = 0;
        }
        superLikeOpacity.value = 0;
      } else {
        superLikeOpacity.value = 0;
        messageOpacity.value = 0;
      }
    },
    onEnd: (event) => {
      const tossX = event.velocityX * 0.1;
      const tossY = event.velocityY * 0.1;

      if (Math.abs(translateX.value) > SWIPE_THRESHOLD) {
        translateX.value = withSpring(translateX.value > 0 ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5, {
          velocity: tossX,
        });
        translateY.value = withSpring(0);
        // Göstergeleri kapat
        likeOpacity.value = withTiming(0);
        dislikeOpacity.value = withTiming(0);
        superLikeOpacity.value = withTiming(0);
        messageOpacity.value = withTiming(0);
        
        runOnJS(translateX.value > 0 ? onSwipeRight : onSwipeLeft)();
      } else if (translateY.value < -SUPER_LIKE_THRESHOLD) {
        translateY.value = withSpring(-SCREEN_HEIGHT * 1.5, {
          velocity: tossY,
        });
        translateX.value = withSpring(0);
        // Göstergeleri kapat
        likeOpacity.value = withTiming(0);
        dislikeOpacity.value = withTiming(0);
        superLikeOpacity.value = withTiming(0);
        messageOpacity.value = withTiming(0);
        
        runOnJS(onSwipeTop)();
      } else if (translateY.value > SUPER_LIKE_THRESHOLD && onSwipeDown) {
        // Aşağı kaydırma işlemi - mesaj gönderme
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        cardRotate.value = withSpring(0);
        // Göstergeleri kapat
        likeOpacity.value = withTiming(0);
        dislikeOpacity.value = withTiming(0);
        superLikeOpacity.value = withTiming(0);
        messageOpacity.value = withTiming(0);
        
        runOnJS(onSwipeDown)();
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        cardRotate.value = withSpring(0);
        // Göstergeleri kapat
        likeOpacity.value = withTiming(0);
        dislikeOpacity.value = withTiming(0);
        superLikeOpacity.value = withTiming(0);
        messageOpacity.value = withTiming(0);
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${cardRotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: cardOpacity.value,
    zIndex: cardElevation.value,
  }));

  // Her bir fotoğraf gösterge çubuğunun animasyon stili
  const getProgressStyle = (index) => useAnimatedStyle(() => {
    // Eğer mevcut fotoğraf indeksi, bu çubuğun indeksinden küçükse, çubuk boş kalmalı
    if (currentPhotoIndex < index) {
      return { width: '0%' };
    }
    
    // Eğer mevcut fotoğraf indeksi, bu çubuğun indeksinden büyükse, çubuk tamamen dolu olmalı
    if (currentPhotoIndex > index) {
      return { width: '100%' };
    }
    
    // Mevcut fotoğraf indeksi ve çubuğun indeksi aynıysa, ilerleme animasyonunu kullan
    return {
      width: `${progressAnim.value * 100}%`,
    };
  });

  // Dışarıdan erişilebilir metodları tanımlayalım
  useImperativeHandle(ref, () => ({
    handleProfilePress: () => {
      if (isFirst) {
        setProfileDetailPhotoIndex(currentPhotoIndex);
        setShowProfileDetail(true);
      }
    }
  }));

  const handleProfilePress = () => {
    if (isFirst) {
      setProfileDetailPhotoIndex(currentPhotoIndex);
      setShowProfileDetail(true);
    }
  };

  // Profile modal action handlers
  const handleProfileLike = async () => {
    if (!currentUser || !currentUser.id) {
      console.error('Kullanıcı oturumu bulunamadı');
      return;
    }
    
    try {
      console.log(`Like işlemi başlatılıyor: ${currentUser.id} -> ${user.id}`);
      
      // Like işlemini veritabanına kaydet
      const { success, error } = await saveUserInteraction(currentUser.id, user.id, 'like');
      
      if (success) {
        // Eşleşme olup olmadığını kontrol et
        const { isMatch } = await checkForMatch(currentUser.id, user.id);
        
        if (isMatch) {
          // Eşleşme durumunda bildirim gösterilebilir
          console.log('Eşleşme Bulundu! 🎉');
          // TODO: Eşleşme bildirimi göster
        }
        
        // Etkileşim callback fonksiyonunu çağır
        if (onInteraction) {
          await onInteraction();
        }
      } else if (error) {
        console.error('Like işlemi kaydedilemedi:', error);
      }
    } catch (error) {
      console.error('Like işlemi sırasında hata:', error);
    }
    
    // Modalı kapat ve sağa swipe fonksiyonunu çağır
    setShowProfileDetail(false);
    onSwipeRight();
  };

  const handleProfileDislike = async () => {
    if (!currentUser || !currentUser.id) {
      console.error('Kullanıcı oturumu bulunamadı');
      return;
    }
    
    try {
      console.log(`Dislike işlemi başlatılıyor: ${currentUser.id} -> ${user.id}`);
      
      // Dislike işlemini veritabanına kaydet
      const { success, error } = await saveUserInteraction(currentUser.id, user.id, 'dislike');
      
      if (success) {
        // Etkileşim callback fonksiyonunu çağır
        if (onInteraction) {
          await onInteraction();
        }
      } else if (error) {
        console.error('Dislike işlemi kaydedilemedi:', error);
      }
    } catch (error) {
      console.error('Dislike işlemi sırasında hata:', error);
    }
    
    // Modalı kapat ve sola swipe fonksiyonunu çağır
    setShowProfileDetail(false);
    onSwipeLeft();
  };

  const handleProfileSuperLike = async () => {
    if (!currentUser || !currentUser.id) {
      console.error('Kullanıcı oturumu bulunamadı');
      return;
    }
    
    try {
      console.log(`SuperLike işlemi başlatılıyor: ${currentUser.id} -> ${user.id}`);
      
      // SuperLike işlemini veritabanına kaydet
      const { success, error } = await saveUserInteraction(currentUser.id, user.id, 'superlike');
      
      if (success) {
        // Eşleşme olup olmadığını kontrol et
        const { isMatch } = await checkForMatch(currentUser.id, user.id);
        
        if (isMatch) {
          // Eşleşme durumunda bildirim gösterilebilir
          console.log('Süper Beğeni ile Eşleşme Bulundu! 🌟');
          // TODO: Eşleşme bildirimi göster
        }
        
        // Etkileşim callback fonksiyonunu çağır
        if (onInteraction) {
          await onInteraction();
        }
      } else if (error) {
        console.error('SuperLike işlemi kaydedilemedi:', error);
      }
    } catch (error) {
      console.error('SuperLike işlemi sırasında hata:', error);
    }
    
    // Modalı kapat ve yukarı swipe fonksiyonunu çağır
    setShowProfileDetail(false);
    onSwipeTop();
  };

  // Beğen (Like) göstergesinin stili - Sağa kaydırma
  const likeIndicatorStyle = useAnimatedStyle(() => ({
    opacity: likeOpacity.value,
    transform: [
      { scale: interpolate(likeOpacity.value, [0, 1], [0.8, 1]) }
    ]
  }));

  // Beğenme (Dislike) göstergesinin stili - Sola kaydırma
  const dislikeIndicatorStyle = useAnimatedStyle(() => ({
    opacity: dislikeOpacity.value,
    transform: [
      { scale: interpolate(dislikeOpacity.value, [0, 1], [0.8, 1]) }
    ]
  }));

  // Süper Beğeni (Super Like) göstergesinin stili - Yukarı kaydırma
  const superLikeIndicatorStyle = useAnimatedStyle(() => ({
    opacity: superLikeOpacity.value,
    transform: [
      { scale: interpolate(superLikeOpacity.value, [0, 1], [0.8, 1]) }
    ]
  }));

  // Mesaj Gönder göstergesinin stili - Aşağı kaydırma
  const messageIndicatorStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
    transform: [
      { scale: interpolate(messageOpacity.value, [0, 1], [0.8, 1]) }
    ]
  }));

  // Engelleme durumunu kontrol et
  useEffect(() => {
    if (currentUser && user && showProfileDetail) {
      checkBlockStatus();
    }
  }, [currentUser, user, showProfileDetail]);
  
  // Engelleme durumunu kontrol eden fonksiyon
  const checkBlockStatus = async () => {
    if (!currentUser || !user) return;
    
    try {
      // Kullanıcının karşı tarafı engelleyip engellemediğini kontrol et
      const { data: blockedByUser, error: blockError } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('blocker_id', currentUser.id)
        .eq('blocked_user_id', user.id)
        .maybeSingle();
      
      if (blockError) {
        console.error('Engelleme durumu kontrol edilirken hata oluştu:', blockError);
      }
      
      // Karşı tarafın kullanıcıyı engelleyip engellemediğini kontrol et
      const { data: blockedByOther, error: otherBlockError } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('blocker_id', user.id)
        .eq('blocked_user_id', currentUser.id)
        .maybeSingle();
      
      if (otherBlockError) {
        console.error('Karşı tarafın engelleme durumu kontrol edilirken hata oluştu:', otherBlockError);
      }
      
      // Engelleme durumlarını ayarla
      setIsBlocked(!!blockedByUser);
      setIsBlockedBy(!!blockedByOther);
    } catch (error) {
      console.error('Engelleme durumu kontrol edilirken hata oluştu:', error);
    }
  };
  
  // Kullanıcıyı engelleme/engeli kaldırma işlemi
  const handleBlockUser = async () => {
    if (!currentUser || !user) return;
    
    try {
      setIsLoadingBlock(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      // Eğer zaten engellenmiş ise, engeli kaldırma seçeneği sunalım
      if (isBlocked) {
        Alert.alert(
          'Engeli Kaldır',
          `${user.first_name} adlı kullanıcı için engeli kaldırmak istiyor musunuz?`,
          [
            {
              text: 'İptal',
              style: 'cancel',
              onPress: () => setIsLoadingBlock(false)
            },
            {
              text: 'Engeli Kaldır',
              style: 'default',
              onPress: async () => {
                // Engellemeyi veritabanından kaldır
                const { data: blockData, error: fetchError } = await supabase
                  .from('user_blocks')
                  .select('id')
                  .eq('blocker_id', currentUser.id)
                  .eq('blocked_user_id', user.id)
                  .maybeSingle();
                
                if (fetchError) {
                  console.error('Engelleme kaydı bulunurken hata oluştu:', fetchError);
                  Alert.alert('Hata', 'Engel kaldırılamadı. Lütfen daha sonra tekrar deneyin.');
                  setIsLoadingBlock(false);
                  return;
                }
                
                if (blockData) {
                  const { error: deleteError } = await supabase
                    .from('user_blocks')
                    .delete()
                    .eq('id', blockData.id);
                  
                  if (deleteError) {
                    console.error('Engel kaldırılırken hata oluştu:', deleteError);
                    Alert.alert('Hata', 'Engel kaldırılamadı. Lütfen daha sonra tekrar deneyin.');
                    setIsLoadingBlock(false);
                    return;
                  }
                  
                  setIsBlocked(false);
                  Alert.alert('Engel Kaldırıldı', `${user.first_name} adlı kullanıcı için engel kaldırıldı.`);
                }
                setIsLoadingBlock(false);
              },
            },
          ],
        );
      } else {
        // Yeni engelleme işlemi yap
        Alert.alert(
          'Kullanıcıyı Engelle',
          `${user.first_name} adlı kullanıcıyı engellemek istediğinize emin misiniz? Engellenen kullanıcılar sizinle iletişim kuramaz.`,
          [
            {
              text: 'İptal',
              style: 'cancel',
              onPress: () => setIsLoadingBlock(false)
            },
            {
              text: 'Engelle',
              style: 'destructive',
              onPress: async () => {
                // Kullanıcıyı engelle
                const { error } = await supabase
                  .from('user_blocks')
                  .insert({
                    blocker_id: currentUser.id,
                    blocked_user_id: user.id
                  });
                
                if (error) {
                  console.error('Kullanıcı engellenirken hata oluştu:', error);
                  Alert.alert('Hata', 'Kullanıcı engellenemedi. Lütfen daha sonra tekrar deneyin.');
                  setIsLoadingBlock(false);
                  return;
                }
                
                setIsBlocked(true);
                Alert.alert('Engellendi', `${user.first_name} adlı kullanıcı engellendi.`);
                // Profil modalını kapat ve sola kaydır (beğenmeme işlemi)
                setShowProfileDetail(false);
                onSwipeLeft();
                setIsLoadingBlock(false);
              },
            },
          ],
        );
      }
    } catch (error) {
      console.error('Engelleme işlemi sırasında hata oluştu:', error);
      setIsLoadingBlock(false);
    }
  };

  // Kullanıcıyı bildir
  const handleReportUser = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('Raporla: ' + user.id);
    
    // Önce bu kullanıcıyı daha önce raporlayıp raporlamadığını kontrol et
    checkPreviousReports();
  };
  
  // Önceki raporları kontrol et
  const checkPreviousReports = async () => {
    if (!currentUser || !user) return;
    
    try {
      // Daha önce yapılmış bir rapor var mı kontrol et
      const { data, error } = await supabase
        .from('user_reports')
        .select('id')
        .eq('reporter_id', currentUser.id)
        .eq('reported_user_id', user.id);
      
      if (error) {
        console.error('Önceki raporlar kontrol edilirken hata:', error);
        showReportOptions(); // Hata durumunda yine de rapor seçeneklerini göster
        return;
      }
      
      if (data && data.length > 0) {
        // Daha önce rapor edilmiş
        Alert.alert(
          'Zaten Raporlandı',
          'Bu kullanıcıyı daha önce raporladınız. Bir kullanıcı yalnızca bir kez raporlanabilir.',
          [{ text: 'Tamam', style: 'cancel' }]
        );
      } else {
        // İlk kez raporlanıyor, rapor seçeneklerini göster
        showReportOptions();
      }
    } catch (error) {
      console.error('Rapor kontrolü sırasında hata:', error);
      showReportOptions(); // Hata durumunda yine de rapor seçeneklerini göster
    }
  };
  
  // Rapor seçeneklerini göster
  const showReportOptions = () => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Kullanıcıyı Bildir',
        'Bu kullanıcıyı neden bildirmek istiyorsunuz?',
        [
          {
            text: 'İptal',
            style: 'cancel',
          },
          {
            text: 'Sahte Profil',
            onPress: () => handleReport('fake_profile'),
          },
          {
            text: 'Uygunsuz İçerik',
            onPress: () => handleReport('inappropriate_content'),
          },
          {
            text: 'Taciz',
            onPress: () => handleReport('harassment'),
          },
          {
            text: 'Spam',
            onPress: () => handleReport('spam'),
          },
          {
            text: 'Rahatsız Edici Davranış',
            onPress: () => handleReport('disturbing_behavior'),
          },
          {
            text: 'Diğer',
            onPress: () => {
              // Diğer sebep için metin girmesini iste
              Alert.prompt(
                'Diğer Sebep',
                'Lütfen bildirim sebebinizi kısaca açıklayın:',
                [
                  {
                    text: 'İptal',
                    style: 'cancel',
                  },
                  {
                    text: 'Bildir',
                    onPress: (reason) => reason ? handleReport('other', reason) : null
                  }
                ],
                'plain-text'
              );
            },
          },
        ],
      );
    } else {
      // Android için özel dialog
      Alert.alert(
        'Kullanıcıyı Bildir',
        'Bu kullanıcıyı neden bildirmek istiyorsunuz?',
        [
          {
            text: 'İptal',
            style: 'cancel',
          },
          {
            text: 'Sahte Profil',
            onPress: () => handleReport('fake_profile'),
          },
          {
            text: 'Uygunsuz İçerik',
            onPress: () => handleReport('inappropriate_content'),
          },
          {
            text: 'Taciz',
            onPress: () => handleReport('harassment'),
          },
          {
            text: 'Spam',
            onPress: () => handleReport('spam'),
          },
          {
            text: 'Rahatsız Edici Davranış',
            onPress: () => handleReport('disturbing_behavior'),
          },
          {
            text: 'Diğer',
            onPress: () => {
              setReportReason('other');
              setShowReportDialog(true);
            },
          },
        ],
      );
    }
  };
  
  // Bildirimi gönder
  const handleReport = async (reason: string, details?: string) => {
    if (!currentUser || !user) return;
    
    try {
      // Bildirimi veritabanına kaydet
      const { error } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: currentUser.id,
          reported_user_id: user.id,
          reason: reason,
          description: details || null,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Bildirim gönderilirken hata oluştu:', error);
        
        // Tablo yoksa oluştur
        if (error.code === '42P01') { // ilişki yok hatası
          console.log('user_reports tablosu bulunamadı, oluşturuluyor...');
          
          const createTableQuery = `
            CREATE TABLE IF NOT EXISTS public.user_reports (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
              reported_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
              reason TEXT NOT NULL,
              description TEXT,
              status TEXT NOT NULL DEFAULT 'pending',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
              admin_notes TEXT,
              resolved_at TIMESTAMP WITH TIME ZONE
            );
            
            CREATE INDEX user_reports_reporter_id_idx ON public.user_reports (reporter_id);
            CREATE INDEX user_reports_reported_user_id_idx ON public.user_reports (reported_user_id);
            CREATE INDEX user_reports_status_idx ON public.user_reports (status);
            
            -- RLS politikaları
            ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
            
            -- Kullanıcılar kendi raporlarını görebilir
            CREATE POLICY "Kullanıcılar kendi raporlarını görebilir" 
            ON public.user_reports FOR SELECT 
            USING (auth.uid() = reporter_id);
            
            -- Kullanıcılar rapor oluşturabilir
            CREATE POLICY "Kullanıcılar rapor oluşturabilir" 
            ON public.user_reports FOR INSERT 
            WITH CHECK (auth.uid() = reporter_id);
            
            -- Trigger için güncelleme zamanı fonksiyonu
            CREATE OR REPLACE FUNCTION update_user_reports_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
              NEW.updated_at = now();
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Güncelleme zamanı trigger'ı
            CREATE TRIGGER update_user_reports_updated_at
            BEFORE UPDATE ON public.user_reports
            FOR EACH ROW
            EXECUTE FUNCTION update_user_reports_updated_at();
          `;
          
          const { error: createTableError } = await supabase.rpc('exec', { query: createTableQuery });
          
          if (createTableError) {
            console.error('Tablo oluşturulurken hata:', createTableError);
            Alert.alert('Hata', 'Bildiriminiz gönderilemedi. Lütfen daha sonra tekrar deneyin.');
            return;
          }
          
          // Tablo oluşturulduktan sonra tekrar dene
          const { error: retryError } = await supabase
            .from('user_reports')
            .insert({
              reporter_id: currentUser.id,
              reported_user_id: user.id,
              reason: reason,
              description: details || null,
              status: 'pending',
              created_at: new Date().toISOString()
            });
            
          if (retryError) {
            console.error('İkinci denemede bildirim gönderilirken hata:', retryError);
            Alert.alert('Hata', 'Bildiriminiz gönderilemedi. Lütfen daha sonra tekrar deneyin.');
            return;
          }
        } else {
          Alert.alert('Hata', 'Bildiriminiz gönderilemedi. Lütfen daha sonra tekrar deneyin.');
          return;
        }
      }
      
      Alert.alert('Teşekkürler', 'Bildiriminiz alındı. Ekibimiz inceleme yapacaktır.');
    } catch (error) {
      console.error('Bildirim işlemi sırasında hata oluştu:', error);
      Alert.alert('Hata', 'Bildiriminiz gönderilemedi. Lütfen daha sonra tekrar deneyin.');
    }
  };

  return (
    <>
      <PanGestureHandler onGestureEvent={gestureHandler} enabled={isFirst}>
        <Animated.View style={[styles.card, cardStyle]}>
          <LongPressGestureHandler
            onHandlerStateChange={onLongPressStateChange}
            minDurationMs={150}
            maxDist={Number.MAX_VALUE} 
            enabled={isFirst}
          >
            <View style={styles.cardTouchArea}>
              <Image
                source={{ uri: currentPhoto }}
                style={styles.photo}
                resizeMode="cover"
              />

              {/* Fotoğraf için üst gölgesi */}
              <LinearGradient
                colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.3)', 'transparent']}
                style={styles.topShadow}
              />

              {/* Story tarzı fotoğraf gösterge çubukları */}
              {photos.length > 1 && (
                <View style={styles.photoNavigation}>
                  {photos.map((_, index) => (
                    <View key={index} style={styles.storyBarContainer}>
                      <Animated.View 
                        style={[
                          styles.storyBarProgress,
                          getProgressStyle(index),
                        ]} 
                      />
                    </View>
                  ))}
                </View>
              )}

              {/* Fotoğraf dokunmatik alanları */}
              {photos.length > 1 && (
                <View style={styles.photoTouchAreas} pointerEvents="box-none">
                  <TouchableOpacity
                    style={styles.previousPhotoArea}
                    onPress={previousPhoto}
                    activeOpacity={1}
                  />
                  <TouchableOpacity
                    style={styles.nextPhotoArea}
                    onPress={nextPhoto}
                    activeOpacity={1}
                  />
                </View>
              )}

              {/* Kullanıcı Bilgileri - Basılı tutma biyografi bölümünde çalışsın */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)']}
                style={styles.userInfo}
                pointerEvents="box-none"
              >
                <TouchableOpacity 
                  style={styles.nameAgeContainer}
                  onPress={handleProfilePress}
                  activeOpacity={0.8}
                  disabled={!isFirst}
                >
                  <Text style={styles.nameText}>
                    <Text style={styles.name}>{user.first_name}</Text>
                    <Text style={styles.age}>, {calculateAge(user.birth_date)}</Text>
                  </Text>
                  <View style={styles.onlineIndicator} />
                </TouchableOpacity>
                
                {/* İlgi Alanları */}
                <View style={styles.interestsContainer}>
                  {interests.map((interest, index) => (
                    <View key={index} style={styles.interestTag}>
                      <Text style={styles.interestText}>{interest}</Text>
                    </View>
                  ))}
                </View>
                
                {/* Biyografi - Tam veya kısaltılmış sürümü gösteriliyor */}
                <Text 
                  ref={bioTextRef}
                  style={styles.biography}
                  numberOfLines={showFullBio ? undefined : 3}
                  onTextLayout={checkBioLength}
                >
                  {user.biography || "i'm all about surrounding myself with positivity and the right circle. I'm a sucker for pretty skies, crazy sunsets and the moon. you'd probably find."}
                </Text>
                
                {/* Devamını Gör butonu - yalnızca biyografi 3 satırdan uzunsa görünür */}
                {bioExceedsMaxLines && (
                  <TouchableOpacity 
                    style={styles.readMoreButton}
                    onPress={() => setShowFullBio(!showFullBio)}
                  >
                    <Text style={styles.readMoreText}>
                      {showFullBio ? "Daha Az Göster" : "...Devamını Gör"}
                    </Text>
                  </TouchableOpacity>
                )}
              </LinearGradient>

              {/* Beğeni Göstergeleri - Kaydırma miktarına göre opaklık değişimi */}
              {isFirst && (
                <>
                  {/* Like/Beğen Göstergesi - Sağa kaydırma */}
                  <Animated.View 
                    style={[
                      styles.actionIndicator, 
                      styles.likeIndicator,
                      likeIndicatorStyle
                    ]}
                    pointerEvents="none"
                  >
                    <View style={styles.indicatorBackground}>
                      <MaterialCommunityIcons
                        name="heart"
                        size={60}
                        color="#FF4B7E"
                      />
                    </View>
                    <Text style={styles.indicatorText}>Beğen</Text>
                  </Animated.View>

                  {/* Dislike/Beğenme Göstergesi - Sola kaydırma */}
                  <Animated.View 
                    style={[
                      styles.actionIndicator, 
                      styles.dislikeIndicator,
                      dislikeIndicatorStyle
                    ]}
                    pointerEvents="none"
                  >
                    <View style={styles.indicatorBackground}>
                      <MaterialCommunityIcons
                        name="close"
                        size={60}
                        color="#FF4B4B"
                      />
                    </View>
                    <Text style={styles.indicatorText}>Geç</Text>
                  </Animated.View>

                  {/* SuperLike/Süper Beğeni Göstergesi - Yukarı kaydırma */}
                  <Animated.View 
                    style={[
                      styles.actionIndicator, 
                      styles.superLikeIndicator,
                      superLikeIndicatorStyle
                    ]}
                    pointerEvents="none"
                  >
                    <View style={styles.indicatorBackground}>
                      <MaterialCommunityIcons
                        name="star"
                        size={60}
                        color="#4CCFF8"
                      />
                    </View>
                    <Text style={styles.indicatorText}>Süper Beğeni</Text>
                  </Animated.View>

                  {/* Message/Mesaj Göstergesi - Aşağı kaydırma */}
                  <Animated.View 
                    style={[
                      styles.actionIndicator, 
                      styles.messageIndicator,
                      messageIndicatorStyle
                    ]}
                    pointerEvents="none"
                  >
                    <View style={styles.indicatorBackground}>
                      <MaterialCommunityIcons
                        name="chat"
                        size={60}
                        color="#4CCFF8"
                      />
                    </View>
                    <Text style={styles.indicatorText}>Mesaj Gönder</Text>
                  </Animated.View>
                </>
              )}
            </View>
          </LongPressGestureHandler>
        </Animated.View>
      </PanGestureHandler>

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
                <Text style={styles.profileDetailName}>{user.first_name}</Text>
                <Text style={styles.profileDetailAge}>, {calculateAge(user.birth_date)}</Text>
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
                  {photos.map((photo, index) => (
                    <Image 
                      key={index} 
                      source={{ uri: photo }} 
                      style={styles.profileDetailPhoto}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
                
                {/* Fotoğraf indikatörleri */}
                {photos.length > 1 && (
                  <View style={styles.photoIndicatorsContainer}>
                    {photos.map((_, index) => (
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
                  {interests.map((interest, index) => (
                    <View key={index} style={styles.profileInterestTag}>
                      <Text style={styles.profileInterestText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Biyografi */}
              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>Hakkında</Text>
                <Text style={styles.profileBio}>
                  {user.biography || "i'm all about surrounding myself with positivity and the right circle. I'm a sucker for pretty skies, crazy sunsets and the moon. you'd probably find."}
                </Text>
              </View>

              {/* Butonlar */}
              <View style={styles.profileButtonsContainer}>
                <TouchableOpacity 
                  style={styles.messageSendButton}
                  onPress={() => {
                    console.log(`Mesaj gönder: ${user.first_name}`);
                    setShowProfileDetail(false);
                    if (onSwipeDown) {
                      onSwipeDown(); // Mesaj göndermeyi başlat
                    }
                  }}
                >
                  <Text style={styles.messageSendButtonText}>{user.first_name}'e Mesaj Gönder</Text>
                </TouchableOpacity>

                {/* Hediye Gönder Butonu */}
                <TouchableOpacity 
                  style={[styles.messageSendButton, styles.giftButton]}
                  onPress={() => {
                    console.log(`Hediye gönder: ${user.first_name}`);
                    setShowProfileDetail(false);
                    
                    // Önce HomeScreen'deki handleMessage mantığına benzer şekilde bir sohbet kontrol et
                    if (currentUser && currentUser.id) {
                      // Var olan sohbet odası kontrolü yapmak yerine, onSwipeDown ile mevcut sohbet kontrolünü çağır
                      // ve ardından ChatDetail ekranına showGift parametresi ile gitsin
                      if (onSwipeDown) {
                        onSwipeDown(); // Bu işlev HomeScreen'de mevcut sohbet varsa onu açacak
                        // Not: Burada doğrudan hediye açılmayacak, ama sohbet kontrolü yapılacak
                      }
                    }
                  }}
                >
                  <View style={styles.giftButtonContent}>
                    <AntDesign name="gift" size={20} color="#FFF" style={{marginRight: 8}} />
                    <Text style={styles.messageSendButtonText}>Hediye Gönder</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.secondaryButtonsContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.secondaryButton,
                      isBlocked && styles.secondaryButtonActive
                    ]}
                    onPress={handleBlockUser}
                    disabled={isLoadingBlock}
                  >
                    <Text style={[
                      styles.secondaryButtonText,
                      isBlocked && styles.secondaryButtonTextActive
                    ]}>
                      {isLoadingBlock ? 'İşleniyor...' : isBlocked ? 'Engeli Kaldır' : 'Engelle'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.secondaryButton}
                    onPress={handleReportUser}
                  >
                    <Text style={styles.secondaryButtonText}>Raporla</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Alt Çubuk - Sabit Butonlar - mesaj ekranından gelmediyse göster */}
            {!route?.params?.fromChat && (
              <View style={styles.profileBottomBar}>
                <TouchableOpacity 
                  style={[styles.profileActionButton, styles.profileDislikeButton]}
                  onPress={handleProfileDislike}
                >
                  <Ionicons name="close" size={32} color="#EC5E6A" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.profileActionButton, styles.profileSuperlikeButton]}
                  onPress={handleProfileSuperLike}
                >
                  <Ionicons name="star" size={28} color="#4CCFF8" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.profileActionButton, styles.profileLikeButton]}
                  onPress={handleProfileLike}
                >
                  <Ionicons name="heart" size={32} color="#EC5E6A" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Android için özel rapor dialog modalı */}
      <Modal
        visible={showReportDialog}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReportDialog(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.reportModalContainer}>
            <View style={styles.reportModalHeader}>
              <Text style={styles.reportModalTitle}>Bildirim Detayları</Text>
              <TouchableOpacity onPress={() => setShowReportDialog(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.reportModalLabel}>
              Lütfen bildirim sebebinizi kısaca açıklayın:
            </Text>
            
            <TextInput
              style={styles.reportModalInput}
              multiline
              placeholder="Açıklama yazın..."
              placeholderTextColor="#999"
              value={reportDetails}
              onChangeText={setReportDetails}
              maxLength={500}
            />
            
            <View style={styles.reportModalButtonRow}>
              <TouchableOpacity 
                style={[styles.reportModalButton, styles.reportModalCancelButton]}
                onPress={() => setShowReportDialog(false)}
              >
                <Text style={styles.reportModalButtonText}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.reportModalButton, 
                  styles.reportModalSubmitButton,
                  !reportDetails.trim() && styles.reportModalButtonDisabled
                ]}
                onPress={() => {
                  if (reportDetails.trim()) {
                    setShowReportDialog(false);
                    handleReport(reportReason, reportDetails);
                    setReportDetails('');
                  }
                }}
                disabled={!reportDetails.trim()}
              >
                <Text style={styles.reportModalButtonText}>Bildir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    backgroundColor: '#000000',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  cardContent: {
    width: '100%',
    height: '100%',
  },
  cardTouchArea: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoNavigation: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.xs / 2,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  storyBarContainer: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  storyBarProgress: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
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
  photoTouchAreas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '30%',
    flexDirection: 'row',
  },
  previousPhotoArea: {
    flex: 1,
  },
  nextPhotoArea: {
    flex: 1,
  },
  userInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    paddingTop: SPACING.xxl,
  },
  nameAgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  nameText: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: 10,
  },
  name: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  age: {
    fontSize: 30,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CCC50',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  interestTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(80,80,80,0.7)',
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  interestText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  biography: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    opacity: 0.8,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.lg,
  },
  readMoreText: {
    color: '#FF4B7E',
    fontSize: 14,
    fontWeight: '600',
  },
  actionIndicator: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  indicatorBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  indicatorText: {
    marginTop: 5,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  likeIndicator: {
    right: SCREEN_WIDTH * 0.18,
    top: SCREEN_HEIGHT * 0.15,
  },
  dislikeIndicator: {
    left: SCREEN_WIDTH * 0.18,
    top: SCREEN_HEIGHT * 0.15,
  },
  superLikeIndicator: {
    top: SCREEN_HEIGHT * 0.1,
    alignSelf: 'center',
  },
  messageIndicator: {
    bottom: SCREEN_HEIGHT * 0.1,
    alignSelf: 'center',
  },
  topShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 5,
  },
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
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(50,50,50,0.5)',
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
  profileBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  profileActionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileDislikeButton: {
    backgroundColor: '#FFFFFF',
  },
  profileSuperlikeButton: {
    backgroundColor: '#FFFFFF',
  },
  profileLikeButton: {
    backgroundColor: '#FFFFFF',
  },
  giftButton: {
    backgroundColor: '#FF4B7E',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  giftButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryButtonActive: {
    backgroundColor: '#FF4B7E',
  },
  secondaryButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Rapor dialog modalı stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reportModalContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reportModalLabel: {
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 10,
  },
  reportModalInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 15,
    color: '#FFFFFF',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  reportModalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportModalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  reportModalCancelButton: {
    backgroundColor: '#444',
  },
  reportModalSubmitButton: {
    backgroundColor: '#FF4B7E',
  },
  reportModalButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.7,
  },
  reportModalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 