import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  Text,
  SafeAreaView,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Switch,
  FlatList,
  PanResponder,
  Animated as RNAnimated,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { UserCard } from '../../../components/cards/UserCard';
import { supabase } from '../../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../../../contexts/UserContext';
import { CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { HomeTopBar } from '../../../components/navigation/HomeTopBar';
import { saveUserInteraction, checkForMatch } from '../../../services/interaction';
import { useChatRooms } from '../../../hooks/useChatRooms';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../theme';
import Animated from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = (SCREEN_WIDTH - (SPACING.md * 3)) / 2; // 2 sütun, aralarında SPACING.md boşluk

interface User {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  photos: string[];
  biography: string;
  gender: string;
  interests?: string[];
  profile_photo?: string;
  location: {
    city: string;
    country: string;
  };
}

type ChatStackParamList = {
  Home: undefined;
  ChatDetail: {
    conversationId: string;
    userName: string;
    userAvatar: string;
    showGift: boolean;
  };
  SuperLikeScreen: undefined;
};

type NavigationProp = StackNavigationProp<ChatStackParamList, 'Home'>;

// Kullanıcı listesi kartı için mini bileşen
const UserListItem = ({ user, onPress }: { user: User, onPress: () => void }) => {
  const photos = user.photos || [];
  const profilePhoto = photos[0] || user.profile_photo || 'https://via.placeholder.com/150';
  
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

  return (
    <TouchableOpacity style={styles.userListItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.userListImageContainer}>
        <Image 
          source={{ uri: profilePhoto }} 
          style={styles.userListImage} 
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.userListImageGradient}
        />
      </View>
      <View style={styles.userListInfo}>
        <Text style={styles.userListName} numberOfLines={1}>
          {user.first_name}, {calculateAge(user.birth_date)}
        </Text>
        <View style={styles.userListLocation}>
          <MaterialCommunityIcons name="map-marker" size={12} color="rgba(255,255,255,0.8)" />
          <Text style={styles.userListLocationText} numberOfLines={1}>
            {user.location?.city || 'Bilinmeyen Konum'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export function HomeScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [isListView, setIsListView] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  
  // Filtreleme modalı için state'ler
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterLocation, setFilterLocation] = useState('');
  const [filterGender, setFilterGender] = useState<string[]>([]);
  const [filterAgeRange, setFilterAgeRange] = useState<[number, number]>([18, 60]);
  const [filterHobbies, setFilterHobbies] = useState<string[]>([]);
  const [filterOnlyWithBio, setFilterOnlyWithBio] = useState(false);
  const [availableHobbies, setAvailableHobbies] = useState<string[]>([]);
  const [isFiltersApplied, setIsFiltersApplied] = useState(false);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [selectedUserIndex, setSelectedUserIndex] = useState(-1);
  
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useUser();
  const { createRoom } = useChatRooms();
  
  // Referanslar
  const swipeRef = useRef(null);

  // React Native Animated için referanslar
  const minAgePosition = useRef(new RNAnimated.Value(0)).current;
  const maxAgePosition = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    checkUser();
    checkUserPremium();
  }, [user]);

  // Görünüm modunu yerel depolamaya kaydet
  useEffect(() => {
    saveViewModePreference();
  }, [isListView]);

  // Uygulama açıldığında kaydedilmiş görünüm modunu al
  useEffect(() => {
    loadViewModePreference();
  }, []);

  // Kullanıcıların tükendiği veya azaldığı durumları izle
  useEffect(() => {
    if (!loading && users.length === 0) {
      // Hiç kullanıcı yoksa yeniden getir
      console.log('Kullanıcı listesi boş, tekrar yükleniyor...');
      fetchUsers();
    } else if (!loading && currentIndex >= users.length - 1 && users.length > 0) {
      // Son kullanıcıya geldiğimizde veya kullanıcı sayısı azaldığında yeni kullanıcıları getir
      console.log('Son kullanıcıya yaklaşılıyor, liste yenileniyor...');
      fetchUsers();
    }
  }, [currentIndex, users.length, loading]);

  const loadViewModePreference = async () => {
    try {
      const viewMode = await AsyncStorage.getItem('viewMode');
      if (viewMode !== null) {
        setIsListView(viewMode === 'list');
      }
    } catch (error) {
      console.error('Görünüm modu ayarı alınamadı:', error);
    }
  };

  const saveViewModePreference = async () => {
    try {
      await AsyncStorage.setItem('viewMode', isListView ? 'list' : 'card');
    } catch (error) {
      console.error('Görünüm modu ayarı kaydedilemedi:', error);
    }
  };

  const toggleViewMode = () => {
    setIsListView(prev => !prev);
  };

  const checkUser = async () => {
    if (!user) {
      console.log('Kullanıcı bulunamadı, giriş ekranına yönlendiriliyor');
      try {
        // Önce logout işlemini çağır
        await logout();
        
        // Sonra yönlendirme yap
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
          })
        );
      } catch (error) {
        console.error('Çıkış işlemi hatası:', error);
      }
      return;
    }
    
    // Kullanıcı bilgisi varsa direkt olarak kullanıcıları getir
    console.log('Oturum açık kullanıcı ID:', user.id);
    fetchUsers();
  };

  // Filtreleri uygulama fonksiyonu
  const applyFilters = () => {
    setIsFiltersApplied(true);
    setShowFilterModal(false);
    fetchUsers(); // Filtrelenmiş kullanıcıları getir
  };
  
  // Filtreleri sıfırlama fonksiyonu
  const resetFilters = async () => {
    setFilterLocation('');
    
    // Kullanıcının ilk tercihlerine geri dön
    if (user) {
      try {
        const { data: preferences, error: prefError } = await supabase
          .from('users')
          .select('interested_in')
          .eq('id', user.id)
          .single();

        if (!prefError && preferences?.interested_in) {
          setFilterGender(preferences.interested_in);
        } else {
          setFilterGender([]);
        }
      } catch (error) {
        console.error('Tercihler alınamadı:', error);
        setFilterGender([]);
      }
    } else {
      setFilterGender([]);
    }
    
    setFilterAgeRange([18, 60]);
    setFilterHobbies([]);
    setFilterOnlyWithBio(false);
    setIsFiltersApplied(false);
    fetchUsers(); // Tüm kullanıcıları getir
  };
  
  // Filtreleme butonuna tıklandığında modal'ı göster
  const handleShowFilterModal = () => {
    fetchAvailableHobbies();
    fetchAvailableCities();
    // Kullanıcının mevcut tercihlerini yükle
    if (user && filterGender.length === 0) {
      loadUserPreferences();
    }
    setShowFilterModal(true);
  };

  // Kullanıcı tercihlerini yükle
  const loadUserPreferences = async () => {
    if (!user) return;
    
    try {
      const { data: preferences, error: prefError } = await supabase
        .from('users')
        .select('interested_in')
        .eq('id', user.id)
        .single();

      if (!prefError && preferences?.interested_in) {
        setFilterGender(preferences.interested_in);
      }
    } catch (error) {
      console.error('Tercihler alınamadı:', error);
    }
  };

  // Mevcut şehirleri getir
  const fetchAvailableCities = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('location')
        .not('location', 'is', null);
        
      if (error) {
        console.error('Şehirler alınamadı:', error);
        return;
      }
      
      if (data) {
        // Benzersiz şehirleri filtrele ve sırala
        const cities = data
          .map(item => item.location?.city)
          .filter(city => city && city.trim() !== '')
          .filter((city, index, self) => self.indexOf(city) === index)
          .sort();
          
        setAvailableCities(['Farketmez', ...cities]);
      }
    } catch (error) {
      console.error('Şehirler alınırken hata:', error);
    }
  };

  // Hobi kategorileri tablosunun kurulumunu yap
  const setupHobbyCategories = async () => {
    try {
      console.log('Hobi kategorileri tablosu kuruluyor...');

      // Tablo mevcut mu kontrol et
      const { error: checkError } = await supabase
        .from('hobby_categories')
        .select('count', { count: 'exact', head: true });

      if (checkError && checkError.code === '42P01') {
        console.log('Tablo bulunamadı, alternatif olarak kullanıcı hobilerini kullanıyoruz');
        // Tablo yoksa oluşturmaya çalışmak yerine direkt kullanıcı hobilerini kullanalım
        await fetchUserHobbies();
        return false;
      }

      // Tablo varsa ama boşsa veri ekle
      const { count, error: countError } = await supabase
        .from('hobby_categories')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Hobi sayısı alınamadı:', countError);
        return false;
      }

      if (count === 0) {
        // HobbiesStep.tsx'den hobileri al
        const defaultHobbies = [
          { name: 'Seyahat', icon: 'airplane' },
          { name: 'Fotoğraf', icon: 'camera' },
          { name: 'Müzik', icon: 'music' },
          { name: 'Sinema', icon: 'movie' },
          { name: 'Spor', icon: 'basketball' },
          { name: 'Yemek', icon: 'food' },
          { name: 'Dans', icon: 'dance-ballroom' },
          { name: 'Kitap', icon: 'book-open-page-variant' },
          { name: 'Yoga', icon: 'yoga' },
          { name: 'Doğa', icon: 'hiking' },
          { name: 'Resim', icon: 'palette' },
          { name: 'Oyun', icon: 'gamepad-variant' },
          { name: 'Fitness', icon: 'dumbbell' },
          { name: 'Yüzme', icon: 'swim' },
          { name: 'Bisiklet', icon: 'bike' },
          { name: 'Kamp', icon: 'tent' },
          { name: 'Tiyatro', icon: 'theater' },
          { name: 'Bahçe', icon: 'flower' },
          { name: 'Dalınç', icon: 'meditation' },
          { name: 'Koleksiyon', icon: 'archive' },
        ];

        // Hobileri tabloya ekle
        const { error: insertError } = await supabase
          .from('hobby_categories')
          .insert(defaultHobbies);

        if (insertError) {
          console.error('Hobileri ekleme hatası:', insertError);
          await fetchUserHobbies();
          return false;
        }

        console.log('Hobi kategorileri tablosu başarıyla kuruldu.');
      }

      return true; // Tablo zaten var
    } catch (error) {
      console.error('Hobi kategorileri kurulum hatası:', error);
      await fetchUserHobbies();
      return false;
    }
  };

  // Mevcut tüm hobileri getir
  const fetchAvailableHobbies = async () => {
    try {
      // Önce tablo varsa kontrol et
      const { error: checkError } = await supabase
        .from('hobby_categories')
        .select('count', { count: 'exact', head: true });
        
      if (checkError && checkError.code === '42P01') {
        // Tablo yoksa kullanıcıların hobi verilerini kullan
        console.warn('hobby_categories tablosu bulunamadı, kullanıcı hobilerinden alınıyor');
        await fetchUserHobbies();
      } else {
        // Tablo varsa oradan hobileri al
        const { data, error } = await supabase
          .from('hobby_categories')
          .select('name')
          .order('name', { ascending: true });
          
        if (error) {
          console.error('Hobiler alınamadı:', error);
          await fetchUserHobbies();
          return;
        }
        
        if (data && data.length > 0) {
          const hobbies = data.map(item => item.name);
          setAvailableHobbies(hobbies);
        } else {
          // Veri yoksa veya boşsa, hobi tablosunu kurmayı dene
          const setupSuccess = await setupHobbyCategories();
          
          if (setupSuccess) {
            // Kurulum başarılıysa tekrar sorgula
            const { data: newData, error: newError } = await supabase
              .from('hobby_categories')
              .select('name')
              .order('name', { ascending: true });
              
            if (!newError && newData) {
              const hobbies = newData.map(item => item.name);
              setAvailableHobbies(hobbies);
            } else {
              await fetchUserHobbies();
            }
          } else {
            await fetchUserHobbies();
          }
        }
      }
    } catch (error) {
      console.error('Hobiler alınırken hata:', error);
      // Hata durumunda kullanıcı hobilerini al
      await fetchUserHobbies();
    }
  };

  // Kullanıcıların hobi verilerini al
  const fetchUserHobbies = async () => {
    try {
      console.warn('hobby_categories tablosu bulunamadı, kullanıcı hobilerinden alınıyor');
      const { data, error } = await supabase
        .from('users')
        .select('hobbies');
        
      if (error) {
        console.error('Kullanıcı hobileri alınamadı:', error);
        return;
      }
      
      if (data) {
        const allHobbies = data
          .flatMap(user => user.hobbies || [])
          .filter(hobby => hobby && hobby.trim() !== '');
          
        // Benzersiz hobileri al ve alfabetik sırala
        const uniqueHobbies = [...new Set(allHobbies)].sort();
        setAvailableHobbies(uniqueHobbies);
      }
    } catch (error) {
      console.error('Kullanıcı hobileri alınırken hata:', error);
    }
  };
  
  // Cinsiyet seçimini toggle et
  const toggleGenderFilter = (gender: string) => {
    setFilterGender(prev => 
      prev.includes(gender) 
        ? prev.filter(g => g !== gender) 
        : [...prev, gender]
    );
  };
  
  // Hobi seçimini toggle et
  const toggleHobbyFilter = (hobby: string) => {
    setFilterHobbies(prev => 
      prev.includes(hobby) 
        ? prev.filter(h => h !== hobby) 
        : [...prev, hobby]
    );
  };

  const fetchUsers = async () => {
    try {
      // Kullanıcı bilgilerini kontrol edelim
      if (!user) {
        console.error('Kullanıcı bilgileri bulunamadı');
        return;
      }

      console.log('Oturum açmış kullanıcı ID:', user.id);

      // UserContext'teki kullanıcı ID'sini kullanarak veritabanından kullanıcı bilgilerini alalım
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Kullanıcı profili alınamadı:', userError);
        await logout();
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
          })
        );
        return;
      }

      // Kullanıcının tercihlerini al
      const { data: preferences, error: prefError } = await supabase
        .from('users')
        .select('interested_in, gender')
        .eq('id', user.id)
        .single();

      if (prefError) {
        console.error('Tercihler alınamadı:', prefError);
        return;
      }

      if (!preferences?.interested_in) {
        console.error('Kullanıcı tercihleri bulunamadı');
        return;
      }

      console.log('Kullanıcı tercihleri alındı:', preferences);
      
      // Kullanıcının daha önce etkileşimde bulunduğu kullanıcıların ID'lerini al
      console.log('Kullanıcının etkileşimlerini alıyorum:', user.id);
      
      const { data: interactions, error: interactionsError } = await supabase
        .from('user_interactions')
        .select('target_user_id')
        .eq('user_id', user.id);
      
      if (interactionsError) {
        console.error('Etkileşimler alınamadı:', interactionsError);
        // Hata olsa bile devam et, etkileşimler olmadan kullanıcıları getirebiliriz
      }
      
      // Kullanıcının engellediği kullanıcıların ID'lerini al
      console.log('Kullanıcının engellediği kişileri alıyorum:', user.id);
      
      const { data: blockedUsers, error: blockedUsersError } = await supabase
        .from('user_blocks')
        .select('blocked_user_id')
        .eq('blocker_id', user.id);
      
      if (blockedUsersError) {
        console.error('Engellenen kullanıcılar alınamadı:', blockedUsersError);
        // Hata olsa bile devam et
      }
      
      // Daha önce etkileşimde bulunulan kullanıcı ID'lerini bir diziye çıkar
      const interactedUserIds = interactions?.map(i => i.target_user_id) || [];
      console.log(`Etkileşimde bulunulan ${interactedUserIds.length} kullanıcı:`, interactedUserIds);
      
      // Engellenen kullanıcı ID'lerini bir diziye çıkar
      const blockedUserIds = blockedUsers?.map(b => b.blocked_user_id) || [];
      console.log(`Engellenen ${blockedUserIds.length} kullanıcı:`, blockedUserIds);
      
      // Sorgu oluştur
      let query = supabase
        .from('users')
        .select(`
          id, 
          first_name,
          last_name,
          birth_date, 
          photos, 
          biography, 
          gender, 
          hobbies, 
          location
        `)
        .neq('id', user.id);
      
      // Filtreler uygulanmışsa sorguya ekle
      if (isFiltersApplied) {
        // 1. Cinsiyet filtreleme
        if (filterGender.length > 0) {
          query = query.in('gender', filterGender);
        } else {
          // Filtre yoksa varsayılan tercihler kullanılsın
          query = query.in('gender', preferences.interested_in);
        }
        
        // 2. Konum filtreleme
        if (filterLocation && filterLocation.trim() !== '') {
          query = query.ilike('location->>city', `%${filterLocation}%`);
        }
        
        // 3. Yaş aralığı filtreleme
        const currentDate = new Date();
        const minYear = currentDate.getFullYear() - filterAgeRange[1];
        const maxYear = currentDate.getFullYear() - filterAgeRange[0];
        
        const minDate = new Date(minYear, 0, 1).toISOString().split('T')[0];
        const maxDate = new Date(maxYear, 11, 31).toISOString().split('T')[0];
        
        query = query.gte('birth_date', minDate).lte('birth_date', maxDate);
        
        // 4. Sadece biyografisi olanlar
        if (filterOnlyWithBio) {
          query = query.not('biography', 'is', null).neq('biography', '');
        }
        
        // 5. Hobiler filtreleme - cross-match yapamıyoruz, sonradan filtreleyeceğiz
      } else {
        // Filtre yoksa varsayılan tercihler
        query = query.in('gender', preferences.interested_in);
      }
      
      // Tüm potansiyel eşleşmeleri al
      const { data: allPotentialUsers, error: usersError } = await query;
      
      if (usersError) {
        console.error('Kullanıcılar alınamadı:', usersError);
        return;
      }
      
      console.log(`Toplam ${allPotentialUsers?.length || 0} potansiyel eşleşme adayı`);
      
      // Etkileşimde bulunulmayan ve engellenmemiş kullanıcıları filtrele
      let filteredUsers = allPotentialUsers?.filter(user => 
        !interactedUserIds.includes(user.id) && !blockedUserIds.includes(user.id)
      ) || [];
      
      // Hobi filtreleme
      if (isFiltersApplied && filterHobbies.length > 0) {
        filteredUsers = filteredUsers.filter(user => {
          if (!user.hobbies || !Array.isArray(user.hobbies) || user.hobbies.length === 0) {
            return false;
          }
          
          // En az bir eşleşen hobi olması yeterli
          return user.hobbies.some(hobby => filterHobbies.includes(hobby));
        });
      }
      
      console.log(`Filtreleme sonrası ${filteredUsers.length} kullanıcı kaldı`);
      
      // İşlenmiş kullanıcıları hazırla
      const processedUsers = filteredUsers.map(user => {
        return {
          ...user,
          photos: user.photos || [],
          biography: user.biography || '',
          interests: user.hobbies || [],
          location: {
            city: user.location?.city || 'Bilinmeyen Şehir',
            country: user.location?.country || 'Bilinmeyen Ülke'
          }
        };
      });
      
      setUsers(processedUsers);
      
      // Eğer currentIndex, kullanıcı sayısının dışındaysa sıfırla
      if (currentIndex >= processedUsers.length && processedUsers.length > 0) {
        setCurrentIndex(0);
      }
      
    } catch (error) {
      console.error('Kullanıcıları getirme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (userId: string) => {
    if (!user || !user.id) {
      console.error('Kullanıcı bilgileri bulunamadı');
      return;
    }
    
    try {
      console.log(`Like işlemi başlatılıyor: ${user.id} -> ${userId}`);
      
      // Like işlemini veritabanına kaydet
      const { success, error } = await saveUserInteraction(user.id, userId, 'like');
      
      if (error) {
        console.error('Like işlemi kaydedilemedi:', error);
      }
      
      // Bir sonraki karta geçmek için indeksi arttır
      setCurrentIndex(prevIndex => prevIndex + 1);
      
      // Güncel kullanıcıları almak için kullanıcı listesini güncelle
      // Bu kullanıcıyı filtreler ve taze liste gösterir
      if (currentIndex >= users.length - 2) {
        // Son iki kullanıcıya geldiğimizde listeyi yenile
        await fetchUsers();
      }
      
      // Eşleşme kontrolü yap
      try {
        const { isMatch } = await checkForMatch(user.id, userId);
        if (isMatch) {
          console.log('Eşleşme Bulundu! 🎉');
          // TODO: Eşleşme bildirimi göster
        }
      } catch (matchError) {
        console.error('Eşleşme kontrolü hatası:', matchError);
      }
    } catch (error) {
      console.error('Like işlemi sırasında hata:', error);
      setCurrentIndex(prevIndex => prevIndex + 1);
    }
  };

  const handleDislike = async (userId: string) => {
    if (!user || !user.id) {
      console.error('Kullanıcı bilgileri bulunamadı');
      return;
    }
    
    try {
      console.log(`Dislike işlemi başlatılıyor: ${user.id} -> ${userId}`);
      
      // Dislike işlemini veritabanına kaydet
      const { success, error } = await saveUserInteraction(user.id, userId, 'dislike');
      
      if (error) {
        console.error('Dislike işlemi kaydedilemedi:', error);
      }
      
      // Bir sonraki karta geçmek için indeksi arttır
      setCurrentIndex(prevIndex => prevIndex + 1);
      
      // Güncel kullanıcıları almak için kullanıcı listesini güncelle
      if (currentIndex >= users.length - 2) {
        // Son iki kullanıcıya geldiğimizde listeyi yenile
        await fetchUsers();
      }
      
    } catch (error) {
      console.error('Dislike işlemi sırasında hata:', error);
      setCurrentIndex(prevIndex => prevIndex + 1);
    }
  };

  const handleSuperLike = async (userId: string) => {
    if (!user || !user.id) {
      console.error('Kullanıcı bilgileri bulunamadı');
      return;
    }
    
    try {
      console.log(`SuperLike işlemi başlatılıyor: ${user.id} -> ${userId}`);
      
      // Kullanıcının SuperLike hakkını kontrol et
      const { data: superlikesData, error: superlikesError } = await supabase
        .rpc('get_user_superlikes', { p_user_id: user.id });
      
      if (superlikesError) {
        console.error('SuperLike hakları alınamadı:', superlikesError);
        return;
      }
      
      // SuperLike hakkı yoksa SuperLike satın alma sayfasına yönlendir
      if (!superlikesData || superlikesData <= 0) {
        Alert.alert(
          'SuperLike Hakkınız Yok',
          'SuperLike atabilmek için SuperLike hakkı satın almalısınız.',
          [
            {
              text: 'İptal',
              style: 'cancel',
            },
            {
              text: 'SuperLike Satın Al',
              onPress: () => navigation.navigate('SuperLikeScreen' as never),
            },
          ]
        );
        return;
      }
      
      // SuperLike hakkı varsa, kullan
      const { data, error } = await supabase
        .rpc('use_superlike', {
          p_user_id: user.id,
          p_target_user_id: userId
        });
      
      if (error) {
        console.error('SuperLike kullanımında hata:', error);
        Alert.alert('Hata', 'SuperLike kullanılırken bir sorun oluştu. Lütfen tekrar deneyin.');
        return;
      }
      
      if (data && !data.success) {
        Alert.alert('Hata', data.message || 'SuperLike kullanılamadı.');
        return;
      }
      
      // SuperLike başarılı, kullanıcıyı bilgilendir
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      console.log('SuperLike başarıyla kullanıldı');
      
      // Bir sonraki karta geçmek için indeksi arttır
      setCurrentIndex(prevIndex => prevIndex + 1);
      
      // Güncel kullanıcıları almak için kullanıcı listesini güncelle
      if (currentIndex >= users.length - 2) {
        // Son iki kullanıcıya geldiğimizde listeyi yenile
        await fetchUsers();
      }
      
      // Eşleşme kontrolü yap
      try {
        const { isMatch } = await checkForMatch(user.id, userId);
        if (isMatch) {
          console.log('Süper Beğeni ile Eşleşme Bulundu! 🌟');
          // TODO: Eşleşme bildirimi göster
        }
      } catch (matchError) {
        console.error('Eşleşme kontrolü hatası:', matchError);
      }
    } catch (error) {
      console.error('SuperLike işlemi sırasında hata:', error);
      setCurrentIndex(prevIndex => prevIndex + 1);
    }
  };

  const handleMessage = async (userId: string, showGift = false) => {
    try {
      if (!user || !users.length) return;
      
      // Seçilen kullanıcıyı bul
      const selectedUser = users.find(u => u.id === userId);
      if (!selectedUser) {
        console.error('Seçilen kullanıcı bulunamadı:', userId);
        return;
      }
      
      console.log(`Mesaj gönderme işlemi başlatılıyor: ${user.id} -> ${userId}`);
      
      // Önce mevcut bir oda olup olmadığını kontrol et
      const { data: existingRooms } = await supabase
        .from('room_participants')
        .select(`
          room_id
        `)
        .eq('user_id', user.id);
      
      if (!existingRooms) {
        console.error('Oda bilgileri alınamadı');
        return;
      }
      
      // Kullanıcının katıldığı tüm odaların ID'lerini al
      const roomIds = existingRooms.map(room => room.room_id);
      
      if (roomIds.length === 0) {
        // Hiç oda yoksa doğrudan yeni oda oluştur
        const roomName = `${user.first_name || ''} ${user.last_name || ''} ve ${selectedUser.first_name} ${selectedUser.last_name}`;
        const roomId = await createRoom(roomName, [userId]);
        
        if (!roomId) {
          console.error('Sohbet odası oluşturulamadı.');
          return;
        }
        
        // ChatDetail sayfasına yönlendir
        navigation.navigate('ChatDetail', {
          conversationId: roomId,
          userName: `${selectedUser.first_name} ${selectedUser.last_name}`,
          userAvatar: selectedUser.photos?.[0] || selectedUser.profile_photo || 'https://via.placeholder.com/150',
          showGift: showGift // Hediye modalını açmak için parametre
        });
        return;
      }
      
      // Bu odalardan hedef kullanıcının da bulunduğu bir oda var mı kontrol et
      const { data: commonRooms } = await supabase
        .from('room_participants')
        .select('room_id')
        .eq('user_id', userId)
        .in('room_id', roomIds);
      
      if (commonRooms && commonRooms.length > 0) {
        // Ortak oda var, bu odalar arasında gizlenmiş (hidden_for_user_ids içinde kullanıcı ID'si olan) oda var mı kontrol et
        let validRoomFound = false;
        
        for (const room of commonRooms) {
          const { data: roomData } = await supabase
            .from('rooms')
            .select('id, hidden_for_user_ids')
            .eq('id', room.room_id)
            .single();
          
          if (roomData && (!roomData.hidden_for_user_ids || !roomData.hidden_for_user_ids.includes(user.id))) {
            // Bu oda gizli değil, bunu kullan
            validRoomFound = true;
            
            // Eğer bu sohbet daha önce silinmişse, hidden_for_user_ids'den kullanıcıyı çıkaralım
            if (roomData.hidden_for_user_ids && roomData.hidden_for_user_ids.length > 0) {
              const updatedHiddenIds = roomData.hidden_for_user_ids.filter((id: string) => id !== user.id);
              
              await supabase
                .from('rooms')
                .update({ hidden_for_user_ids: updatedHiddenIds })
                .eq('id', room.room_id);
            }
            
            navigation.navigate('ChatDetail', {
              conversationId: room.room_id,
              userName: `${selectedUser.first_name} ${selectedUser.last_name}`,
              userAvatar: selectedUser.photos?.[0] || selectedUser.profile_photo || 'https://via.placeholder.com/150',
              showGift: showGift // Hediye modalını açmak için parametre
            });
            
            break;
          }
        }
        
        // Eğer geçerli bir oda bulunamadıysa, yeni oda oluştur
        if (!validRoomFound) {
          // Ortak oda yoksa yeni oda oluştur
          const roomName = `${user.first_name || ''} ${user.last_name || ''} ve ${selectedUser.first_name} ${selectedUser.last_name}`;
          const roomId = await createRoom(roomName, [userId]);
          
          if (!roomId) {
            console.error('Sohbet odası oluşturulamadı.');
            return;
          }
          
          // ChatDetail sayfasına yönlendir
          navigation.navigate('ChatDetail', {
            conversationId: roomId,
            userName: `${selectedUser.first_name} ${selectedUser.last_name}`,
            userAvatar: selectedUser.photos?.[0] || selectedUser.profile_photo || 'https://via.placeholder.com/150',
            showGift: showGift // Hediye modalını açmak için parametre
          });
        }
      } else {
        // Ortak oda yoksa yeni oda oluştur
        const roomName = `${user.first_name || ''} ${user.last_name || ''} ve ${selectedUser.first_name} ${selectedUser.last_name}`;
        const roomId = await createRoom(roomName, [userId]);
        
        if (!roomId) {
          console.error('Sohbet odası oluşturulamadı.');
          return;
        }
        
        // ChatDetail sayfasına yönlendir
        navigation.navigate('ChatDetail', {
          conversationId: roomId,
          userName: `${selectedUser.first_name} ${selectedUser.last_name}`,
          userAvatar: selectedUser.photos?.[0] || selectedUser.profile_photo || 'https://via.placeholder.com/150',
          showGift: showGift // Hediye modalını açmak için parametre
        });
      }
    } catch (error) {
      console.error('Mesaj başlatma hatası:', error);
    }
  };

  // Mesaj gönderme modunu açmak için aşağı kaydırma işlemi
  const handleSwipeDown = async () => {
    if (!user || !users.length || currentIndex >= users.length) return;
    
    const selectedUser = users[currentIndex];
    await handleMessage(selectedUser.id);
  };

  // Modal görüntüleme işlemi de mesaj sistemine yönlendirilsin
  const handleShowMessageModal = async () => {
    if (!user || !users.length || currentIndex >= users.length) return;
    
    const selectedUser = users[currentIndex];
    await handleMessage(selectedUser.id);
  };

  // Liste görünümünde kullanıcıya tıklandığında profil detayını aç
  const handleUserItemPress = (userId: string) => {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      setSelectedUserIndex(userIndex);
      setShowUserDetailModal(true);
    }
  };

  // Yaş aralığı kaydırıcıları için değer güncelleme fonksiyonu
  const updateAgeRange = (type: 'min' | 'max', value: number) => {
    // Premium kontrolü
    if (!isPremium) {
      Alert.alert(
        'Premium Özellik',
        'Yaş filtreleme özelliğini kullanabilmek için Premium üye olmanız gerekmektedir.',
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

    if (type === 'min') {
      // Minimum yaş, maksimum yaştan küçük olmalı
      const newMinAge = Math.min(value, filterAgeRange[1] - 1);
      // Sadece minimum yaşı güncelle
      setFilterAgeRange([Math.max(18, newMinAge), filterAgeRange[1]]);
    } else {
      // Maksimum yaş, minimum yaştan büyük olmalı
      const newMaxAge = Math.max(value, filterAgeRange[0] + 1);
      // Sadece maksimum yaşı güncelle
      setFilterAgeRange([filterAgeRange[0], Math.min(60, newMaxAge)]);
    }
  };

  // PanResponder'lar için değerler
  const minAgePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Premium kontrolü
        if (!isPremium) {
          Alert.alert(
            'Premium Özellik',
            'Yaş filtreleme özelliğini kullanabilmek için Premium üye olmanız gerekmektedir.',
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

        // Yatay hareketi slider genişliğine göre hesapla (0-1 arası değer)
        const sliderWidth = SCREEN_WIDTH - 2 * SPACING.md - 40; // Kenar boşluklarını çıkar
        const ratio = (gestureState.moveX - 20) / sliderWidth;
        const calculatedValue = Math.round(18 + ratio * (60 - 18));
        const newPosition = Math.max(18, Math.min(filterAgeRange[1] - 1, calculatedValue));
        
        // Sadece minimum yaşı güncelle, maksimum yaşı değiştirme
        setFilterAgeRange(prev => [newPosition, prev[1]]);
      },
    })
  ).current;

  const maxAgePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Premium kontrolü
        if (!isPremium) {
          Alert.alert(
            'Premium Özellik',
            'Yaş filtreleme özelliğini kullanabilmek için Premium üye olmanız gerekmektedir.',
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

        // Yatay hareketi slider genişliğine göre hesapla (0-1 arası değer)
        const sliderWidth = SCREEN_WIDTH - 2 * SPACING.md - 40; // Kenar boşluklarını çıkar
        const ratio = (gestureState.moveX - 20) / sliderWidth;
        const calculatedValue = Math.round(18 + ratio * (60 - 18));
        const newPosition = Math.min(60, Math.max(filterAgeRange[0] + 1, calculatedValue));
        
        // Sadece maksimum yaşı güncelle, minimum yaşı değiştirme
        setFilterAgeRange(prev => [prev[0], newPosition]);
      },
    })
  ).current;

  // Liste görünümü için görüntüleme
  const renderUserListView = () => {
    return (
      <FlatList
        data={users}
        renderItem={({ item }) => (
          <UserListItem 
            user={item} 
            onPress={() => handleUserItemPress(item.id)}
          />
        )}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.userListContainer}
        columnWrapperStyle={styles.userListColumnWrapper}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.noUsersContainer}>
            <Text style={styles.noUsersText}>Şu an için daha fazla kullanıcı yok</Text>
          </View>
        )}
      />
    );
  };

  // Kart görünümü için görüntüleme
  const renderCardView = () => {
    return (
      <>
        <View style={styles.cardsContainer}>
          {users.length > 0 && currentIndex < users.length ? (
            <>
              {/* Mevcut kullanıcıdan sonraki kart (eğer varsa) */}
              {currentIndex + 1 < users.length && (
                <UserCard
                  key={users[currentIndex + 1].id}
                  user={users[currentIndex + 1]}
                  isFirst={false}
                  swipeRef={swipeRef}
                  onSwipeLeft={() => {}}
                  onSwipeRight={() => {}}
                  onSwipeTop={() => {}}
                  onSwipeDown={() => {}}
                />
              )}
              
              {/* Şu anki kart - en üstte */}
              <UserCard
                key={users[currentIndex].id}
                user={users[currentIndex]}
                isFirst={true}
                swipeRef={swipeRef}
                onSwipeLeft={() => handleDislike(users[currentIndex].id)}
                onSwipeRight={() => handleLike(users[currentIndex].id)}
                onSwipeTop={() => handleSuperLike(users[currentIndex].id)}
                onSwipeDown={handleSwipeDown}
                onInteraction={fetchUsers}
              />
            </>
          ) : (
            <View style={styles.noUsersContainer}>
              <Text style={styles.noUsersText}>Şu an için daha fazla kullanıcı yok</Text>
            </View>
          )}
        </View>

        {/* Bottom Action Buttons - Positioned Absolutely to be Above Cards */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.messageButton]}
            onPress={() => users.length > 0 && currentIndex < users.length && handleMessage(users[currentIndex].id)}
          >
            <Ionicons name="chatbubble" size={26} color="#4CCFF8" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.dislikeButton]}
            onPress={() => users.length > 0 && currentIndex < users.length && handleDislike(users[currentIndex].id)}
          >
            <Ionicons name="close" size={32} color="#EC5E6A" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.likeButton]}
            onPress={() => users.length > 0 && currentIndex < users.length && handleLike(users[currentIndex].id)}
          >
            <Ionicons name="heart" size={32} color="#EC5E6A" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.superlikeButton]}
            onPress={() => users.length > 0 && currentIndex < users.length && handleSuperLike(users[currentIndex].id)}
          >
            <Ionicons name="star" size={26} color="#4CCFF8" />
          </TouchableOpacity>
        </View>
      </>
    );
  };

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

  // Konum filtresi seçildiğinde
  const handleLocationFilter = (city: string) => {
    // Premium kontrolü
    if (!isPremium && city !== '') {
      Alert.alert(
        'Premium Özellik',
        'Konum filtreleme özelliğini kullanabilmek için Premium üye olmanız gerekmektedir.',
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

    if (city === "Farketmez") {
      setFilterLocation(filterLocation === "Farketmez" ? "" : "Farketmez");
    } else {
      if (filterLocation === "Farketmez") {
        setFilterLocation(city);
      } else {
        setFilterLocation(filterLocation === city ? "" : city);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header Bar with Modern Icons */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <HomeTopBar 
          onFilterPress={handleShowFilterModal}
          onViewModeToggle={toggleViewMode}
          isListView={isListView}
        />
      </View>

      {/* Main Content Container with Absolute Positioning */}
      <View style={styles.mainContentContainer}>
        {isListView ? renderUserListView() : renderCardView()}
      </View>

      {/* Filtreleme Modalı */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <LinearGradient
            colors={['#121212', '#1A1A1A', '#232323']}
            style={[styles.modalContent, { paddingTop: insets.top }]}
          >
            {/* Modal Başlık */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <MaterialCommunityIcons name="filter-variant" size={24} color="#4CCFF8" style={styles.modalTitleIcon} />
                <Text style={styles.modalTitle}>Filtreleme</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFilterModal(false)}
              >
                <LinearGradient
                  colors={['#333333', '#222222']}
                  style={styles.closeButtonGradient}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.filterScrollView}>
              {/* Konum Filtreleme */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Konum</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="map-marker" size={20} color="#4CCFF8" style={styles.inputIcon} />
                  {availableCities.length > 0 ? (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.cityChipsContainer}
                    >
                      {availableCities.map((city) => (
                        <TouchableOpacity
                          key={city}
                          style={[
                            styles.cityChip,
                            filterLocation === city && styles.activeCityChip,
                            // Eğer "Farketmez" seçiliyse ve bu "Farketmez" değilse ve başka bir şehir seçiliyse
                            (filterLocation === "Farketmez" && city !== "Farketmez") && styles.disabledChip,
                            // Eğer "Farketmez" değilse ve başka bir şehir seçiliyse "Farketmez" seçeneğini devre dışı bırak
                            (filterLocation !== "" && filterLocation !== "Farketmez" && city === "Farketmez") && styles.disabledChip
                          ]}
                          onPress={() => {
                            handleLocationFilter(city);
                          }}
                          disabled={(filterLocation === "Farketmez" && city !== "Farketmez") || 
                                  (filterLocation !== "" && filterLocation !== "Farketmez" && city === "Farketmez")}
                        >
                          <Text 
                            style={[
                              styles.cityChipText,
                              filterLocation === city && styles.activeCityChipText,
                              (filterLocation === "Farketmez" && city !== "Farketmez") && styles.disabledChipText,
                              (filterLocation !== "" && filterLocation !== "Farketmez" && city === "Farketmez") && styles.disabledChipText
                            ]}
                          >
                            {city}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <TextInput
                      style={styles.input}
                      placeholder="Şehir adı girin"
                      placeholderTextColor="#777"
                      value={filterLocation}
                      onChangeText={setFilterLocation}
                    />
                  )}
                </View>
              </View>
              
              {/* Cinsiyet Filtreleme */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Cinsiyet</Text>
                <View style={styles.chipsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      filterGender.includes('male') && styles.activeFilterChip
                    ]}
                    onPress={() => toggleGenderFilter('male')}
                  >
                    <MaterialCommunityIcons 
                      name="gender-male" 
                      size={18} 
                      color={filterGender.includes('male') ? "#FFFFFF" : "#4CCFF8"} 
                    />
                    <Text 
                      style={[
                        styles.filterChipText, 
                        filterGender.includes('male') && styles.activeFilterChipText
                      ]}
                    >
                      Erkek
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      filterGender.includes('female') && styles.activeFilterChip
                    ]}
                    onPress={() => toggleGenderFilter('female')}
                  >
                    <MaterialCommunityIcons 
                      name="gender-female" 
                      size={18} 
                      color={filterGender.includes('female') ? "#FFFFFF" : "#FF4B7E"} 
                    />
                    <Text 
                      style={[
                        styles.filterChipText, 
                        filterGender.includes('female') && styles.activeFilterChipText
                      ]}
                    >
                      Kadın
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      filterGender.includes('other') && styles.activeFilterChip
                    ]}
                    onPress={() => toggleGenderFilter('other')}
                  >
                    <MaterialCommunityIcons 
                      name="gender-non-binary" 
                      size={18} 
                      color={filterGender.includes('other') ? "#FFFFFF" : "#9C27B0"}
                    />
                    <Text 
                      style={[
                        styles.filterChipText, 
                        filterGender.includes('other') && styles.activeFilterChipText
                      ]}
                    >
                      Diğer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Yaş Aralığı Filtreleme */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Yaş Aralığı</Text>
                <View style={styles.ageRangeContainer}>
                  <Text style={styles.ageRangeText}>{filterAgeRange[0]} - {filterAgeRange[1]} yaş</Text>
                </View>
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderValueContainer}>
                    <Text style={styles.sliderValue}>{filterAgeRange[0]}</Text>
                    <Text style={styles.sliderValue}>{filterAgeRange[1]}</Text>
                  </View>
                  <View style={styles.dualSliderTrack} />
                  <View 
                    style={[
                      styles.dualSliderFill,
                      {
                        left: `${((filterAgeRange[0] - 18) / (60 - 18)) * 100}%`,
                        right: `${100 - ((filterAgeRange[1] - 18) / (60 - 18)) * 100}%`
                      }
                    ]} 
                  />
                  
                  {/* Slider thumb'ları */}
                  <View
                    style={[styles.sliderThumb, { left: `${((filterAgeRange[0] - 18) / (60 - 18)) * 100}%` }]}
                    {...minAgePanResponder.panHandlers}
                  >
                    <View style={styles.thumbInner} />
                  </View>
                  
                  <View
                    style={[styles.sliderThumb, { left: `${((filterAgeRange[1] - 18) / (60 - 18)) * 100}%` }]}
                    {...maxAgePanResponder.panHandlers}
                  >
                    <View style={styles.thumbInner} />
                  </View>
                </View>
                
                {/* Yaş Aralığı Butonları (alternatif kontrol olarak) */}
                <View style={styles.ageButtonsContainer}>
                  <View style={styles.ageButtonGroup}>
                    <TouchableOpacity
                      style={styles.ageButton}
                      onPress={() => updateAgeRange('min', filterAgeRange[0] - 1)}
                    >
                      <Text style={styles.ageButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.ageLabel}>Min Yaş</Text>
                    <TouchableOpacity
                      style={styles.ageButton}
                      onPress={() => updateAgeRange('min', filterAgeRange[0] + 1)}
                    >
                      <Text style={styles.ageButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.ageButtonGroup}>
                    <TouchableOpacity
                      style={styles.ageButton}
                      onPress={() => updateAgeRange('max', filterAgeRange[1] - 1)}
                    >
                      <Text style={styles.ageButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.ageLabel}>Max Yaş</Text>
                    <TouchableOpacity
                      style={styles.ageButton}
                      onPress={() => updateAgeRange('max', filterAgeRange[1] + 1)}
                    >
                      <Text style={styles.ageButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Hobiler Filtreleme */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Hobiler</Text>
                <View style={styles.hobbiesContainer}>
                  {availableHobbies.map(hobby => (
                    <TouchableOpacity
                      key={hobby}
                      style={[
                        styles.hobbyChip,
                        filterHobbies.includes(hobby) && styles.activeHobbyChip
                      ]}
                      onPress={() => toggleHobbyFilter(hobby)}
                    >
                      <Text 
                        style={[
                          styles.hobbyChipText,
                          filterHobbies.includes(hobby) && styles.activeHobbyChipText
                        ]}
                      >
                        {hobby}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Biyografi Filtresi */}
              <View style={styles.filterSection}>
                <View style={styles.bioFilterContainer}>
                  <Text style={styles.filterSectionTitle}>Sadece Biyografisi Olanlar</Text>
                  <Switch
                    value={filterOnlyWithBio}
                    onValueChange={setFilterOnlyWithBio}
                    trackColor={{ false: '#444', true: '#4CCFF8' }}
                    thumbColor={filterOnlyWithBio ? '#fff' : '#f4f3f4'}
                    ios_backgroundColor="#444"
                  />
                </View>
                <Text style={styles.filterDescription}>
                  Aktif ettiğinizde sadece kendini tanımlayan kullanıcıları göreceksiniz.
                </Text>
              </View>
            </ScrollView>

            {/* Filtre Butonları */}
            <View style={styles.filterButtonsContainer}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Filtreleri Sıfırla</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyFilters}
              >
                <LinearGradient
                  colors={['#4CCFF8', '#33A8D6']}
                  style={styles.applyButtonGradient}
                >
                  <Text style={styles.applyButtonText}>Uygula</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </SafeAreaView>
      </Modal>

      {/* Liste görünümü profil detay modalı */}
      <Modal
        visible={showUserDetailModal}
        transparent={true}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowUserDetailModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <LinearGradient
            colors={['#121212', '#1A1A1A', '#232323']}
            style={[styles.modalContent, { paddingTop: insets.top }]}
          >
            {/* Başlık ve Kapatma Butonu */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <MaterialCommunityIcons name="account" size={24} color="#FF6B94" style={styles.modalTitleIcon} />
                <Text style={styles.modalTitle}>
                  {selectedUserIndex >= 0 && users[selectedUserIndex]
                    ? `${users[selectedUserIndex].first_name} Profili`
                    : 'Profil Detayı'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowUserDetailModal(false)}
              >
                <LinearGradient
                  colors={['#333333', '#222222']}
                  style={styles.closeButtonGradient}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {selectedUserIndex >= 0 && users[selectedUserIndex] && (
              <ScrollView style={styles.userDetailScrollView} showsVerticalScrollIndicator={false}>
                {/* Profil Fotoğrafları */}
                <ScrollView 
                  horizontal 
                  pagingEnabled 
                  showsHorizontalScrollIndicator={false}
                  style={styles.userDetailPhotosContainer}
                >
                  {(users[selectedUserIndex].photos || []).map((photo, index) => (
                    <Image 
                      key={index} 
                      source={{ uri: photo }} 
                      style={styles.userDetailPhoto}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>

                {/* Kullanıcı Bilgileri */}
                <View style={styles.userDetailInfo}>
                  <Text style={styles.userDetailName}>
                    {users[selectedUserIndex].first_name}, {calculateAge(users[selectedUserIndex].birth_date)}
                  </Text>
                  <View style={styles.userDetailLocation}>
                    <MaterialCommunityIcons name="map-marker" size={16} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.userDetailLocationText}>
                      {users[selectedUserIndex].location?.city || 'Bilinmeyen Konum'}, {users[selectedUserIndex].location?.country || ''}
                    </Text>
                  </View>
                </View>

                {/* İlgi Alanları */}
                {users[selectedUserIndex].interests && users[selectedUserIndex].interests.length > 0 && (
                  <View style={styles.userDetailInterests}>
                    <Text style={styles.userDetailSectionTitle}>İlgi Alanları</Text>
                    <View style={styles.userDetailInterestTags}>
                      {users[selectedUserIndex].interests.map((interest, index) => (
                        <View key={index} style={styles.userDetailInterestTag}>
                          <Text style={styles.userDetailInterestText}>{interest}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Biyografi */}
                <View style={styles.userDetailBio}>
                  <Text style={styles.userDetailSectionTitle}>Hakkında</Text>
                  <Text style={styles.userDetailBioText}>
                    {users[selectedUserIndex].biography || "Bu kullanıcı henüz bir biyografi eklememiş."}
                  </Text>
                </View>

                {/* Etkileşim Butonları */}
                <View style={styles.userDetailActions}>
                  <TouchableOpacity 
                    style={[styles.userDetailActionButton, styles.userDetailDislikeButton]}
                    onPress={() => {
                      handleDislike(users[selectedUserIndex].id);
                      setShowUserDetailModal(false);
                    }}
                  >
                    <Ionicons name="close" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.userDetailActionButton, styles.userDetailSuperlikeButton]}
                    onPress={() => {
                      handleSuperLike(users[selectedUserIndex].id);
                      setShowUserDetailModal(false);
                    }}
                  >
                    <Ionicons name="star" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.userDetailActionButton, styles.userDetailLikeButton]}
                    onPress={() => {
                      handleLike(users[selectedUserIndex].id);
                      setShowUserDetailModal(false);
                    }}
                  >
                    <Ionicons name="heart" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Mesaj Gönder Butonu */}
                <TouchableOpacity 
                  style={styles.userDetailMessageButton}
                  onPress={() => {
                    handleMessage(users[selectedUserIndex].id);
                    setShowUserDetailModal(false);
                  }}
                >
                  <MaterialCommunityIcons name="chat" size={20} color="#FFFFFF" style={styles.userDetailMessageIcon} />
                  <Text style={styles.userDetailMessageText}>
                    {users[selectedUserIndex].first_name}'e Mesaj Gönder
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </LinearGradient>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// Yaş hesaplama yardımcı fonksiyonu
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    zIndex: 100,
  },
  mainContentContainer: {
    flex: 1,
    position: 'relative',
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: SPACING.md,
    marginTop: 20,
    marginBottom: 80,
    position: 'relative',
  },
  noUsersContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    width: SCREEN_WIDTH * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  noUsersText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 16,
    zIndex: 100,
  },
  actionButton: {
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
  messageButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#4CCFF8',
  },
  dislikeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  likeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  superlikeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  
  // Liste görünümü için yeni stiller
  userListContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg + 80, // Alt bölüm için fazladan boşluk
  },
  userListColumnWrapper: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  userListItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.4,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  userListImageContainer: {
    width: '100%',
    height: '75%',
    position: 'relative',
  },
  userListImage: {
    width: '100%',
    height: '100%',
  },
  userListImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  userListInfo: {
    padding: SPACING.sm,
    justifyContent: 'center',
  },
  userListName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userListLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userListLocationText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginLeft: 4,
  },

  // Profil detay modalı için stiller
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitleIcon: {
    marginRight: SPACING.sm,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  closeButton: {
    borderRadius: BORDER_RADIUS.circular,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.circular,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetailScrollView: {
    flex: 1,
  },
  userDetailPhotosContainer: {
    height: SCREEN_WIDTH,
    width: SCREEN_WIDTH,
  },
  userDetailPhoto: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  userDetailInfo: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  userDetailName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: SPACING.sm,
  },
  userDetailLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetailLocationText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginLeft: SPACING.xs,
  },
  userDetailInterests: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  userDetailSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: SPACING.md,
  },
  userDetailInterestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  userDetailInterestTag: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(80,80,80,0.7)',
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  userDetailInterestText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  userDetailBio: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  userDetailBioText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    lineHeight: 24,
  },
  userDetailActions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginVertical: SPACING.lg,
  },
  userDetailActionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  userDetailDislikeButton: {
    backgroundColor: '#FF4B4B',
  },
  userDetailSuperlikeButton: {
    backgroundColor: '#4CCFF8',
  },
  userDetailLikeButton: {
    backgroundColor: '#FF4B7E',
  },
  userDetailMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#128C7E',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  userDetailMessageIcon: {
    marginRight: SPACING.sm,
  },
  userDetailMessageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Filtreleme modalı için stiller
  filterScrollView: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  filterSection: {
    marginBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: SPACING.md,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: SPACING.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D2D2D',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    height: 40,
    padding: 0,
  },
  cityChipsContainer: {
    paddingVertical: SPACING.xs,
  },
  cityChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#3D3D3D',
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
    marginVertical: SPACING.xs,
  },
  activeCityChip: {
    backgroundColor: '#4CCFF8',
  },
  disabledChip: {
    backgroundColor: '#2D2D2D',
    opacity: 0.5,
  },
  cityChipText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  activeCityChipText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledChipText: {
    color: '#AAAAAA',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#3D3D3D',
    borderRadius: BORDER_RADIUS.md,
    marginVertical: SPACING.xs,
  },
  activeFilterChip: {
    backgroundColor: '#4CCFF8',
  },
  filterChipText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: SPACING.xs,
  },
  activeFilterChipText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  ageRangeContainer: {
    backgroundColor: '#2D2D2D',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  ageRangeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sliderContainer: {
    marginVertical: SPACING.md,
    height: 40,
    position: 'relative',
  },
  sliderValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sliderValue: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  dualSliderTrack: {
    position: 'absolute',
    top: 18,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
  },
  dualSliderFill: {
    position: 'absolute',
    top: 18,
    height: 4,
    backgroundColor: '#4CCFF8',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: 12,
    marginLeft: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CCFF8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  thumbInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
  },
  ageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: SPACING.md,
  },
  ageButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ageButton: {
    width: 36,
    height: 36,
    backgroundColor: '#3D3D3D',
    borderRadius: BORDER_RADIUS.circular,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ageButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  ageLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    marginHorizontal: SPACING.sm,
  },
  hobbiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  hobbyChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#3D3D3D',
    borderRadius: BORDER_RADIUS.md,
    marginVertical: SPACING.xs,
  },
  activeHobbyChip: {
    backgroundColor: '#FF6B94',
  },
  hobbyChipText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  activeHobbyChipText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bioFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  filterDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  resetButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    marginRight: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  applyButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 