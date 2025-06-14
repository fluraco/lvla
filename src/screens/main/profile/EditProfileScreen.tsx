import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
  Keyboard,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-elements';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useUser } from '../../../contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../../lib/supabase';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

// Hobi seçimleri için sabit liste
const PREDEFINED_HOBBIES = [
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

// Cinsiyet seçenekleri
const GENDER_OPTIONS = [
  { id: 'male', label: 'Erkek', icon: 'gender-male' },
  { id: 'female', label: 'Kadın', icon: 'gender-female' },
  { id: 'other', label: 'Diğer', icon: 'gender-non-binary' },
];

interface HobbyItem {
  name: string;
  icon: string;
}

interface ProfileFormData {
  first_name: string;
  last_name: string;
  gender: string;
  interested_in: string[];
  biography: string;
  birth_date: Date | null;
  photos: string[];
  profile_photo: string;
  location: {
    city: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  hobbies: string[];
}

interface LocationSuggestion {
  city: string;
  country: string;
}

// Memoize edilmiş fotoğraf işleme için yeni helper komponent
const MemoizedImage = React.memo(({ uri, style }: { uri: string, style: any }) => (
  <Image 
    source={{ uri }} 
    style={style}
    resizeMode="cover"
    resizeMethod="resize"
  />
));

export function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, refetchUserData } = useUser();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hobbies, setHobbies] = useState<HobbyItem[]>([]);
  const [fetchingHobbies, setFetchingHobbies] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Form verileri
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    gender: '',
    interested_in: [],
    biography: '',
    birth_date: null,
    photos: [],
    profile_photo: '',
    location: {
      city: '',
      country: '',
    },
    hobbies: [],
  });

  // Kullanıcı bilgilerini getir
  useEffect(() => {
    if (user?.id) {
      fetchUserData();
      fetchHobbies();
    }
  }, [user?.id]);

  // Klavye olaylarını dinle
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Kullanıcı bilgilerini getir
  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('Kullanıcı bilgileri alınamadı:', userError);
        Alert.alert('Hata', 'Kullanıcı bilgileri alınamadı');
        return;
      }
      
      if (userData) {
        // Form verisini doldur
        setFormData({
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          gender: userData.gender || '',
          interested_in: userData.interested_in || [],
          biography: userData.biography || '',
          birth_date: userData.birth_date ? new Date(userData.birth_date) : null,
          photos: userData.photos || [],
          profile_photo: userData.profile_photo || '',
          location: userData.location || { city: '', country: '' },
          hobbies: userData.hobbies || [],
        });
      }
    } catch (error) {
      console.error('Kullanıcı bilgileri alınırken hata oluştu:', error);
      Alert.alert('Hata', 'Kullanıcı bilgileri alınırken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Hobileri getir
  const fetchHobbies = async () => {
    setFetchingHobbies(true);
    try {
      // Önce tablo varsa kontrol et
      const { error: checkError } = await supabase
        .from('hobby_categories')
        .select('count', { count: 'exact', head: true });

      if (checkError && checkError.code === '42P01') {
        // Tablo yoksa sabit listemizi kullan
        setHobbies(PREDEFINED_HOBBIES);
      } else {
        // Tablo varsa veritabanından hobileri al
        const { data, error } = await supabase
          .from('hobby_categories')
          .select('name, icon')
          .order('name', { ascending: true });

        if (error) {
          console.error('Hobiler alınamadı:', error);
          // Hata durumunda sabit listeyi kullan
          setHobbies(PREDEFINED_HOBBIES);
        } else if (data && data.length > 0) {
          setHobbies(data);
        } else {
          // Veri yoksa sabit listeyi kullan
          setHobbies(PREDEFINED_HOBBIES);
        }
      }
    } catch (error) {
      console.error('Hobi getirme hatası:', error);
      setHobbies(PREDEFINED_HOBBIES);
    } finally {
      setFetchingHobbies(false);
    }
  };

  // Form verilerini güncelle
  const handleInputChange = (field: keyof ProfileFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Lokasyon güncelleme
  const handleLocationChange = (field: 'city' | 'country', value: string) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }));
    
    if (field === 'city' && value.length > 2) {
      // Şehir önerilerini getir (örnek veri, gerçek uygulamada API kullanılabilir)
      const suggestions = [
        { city: 'İstanbul', country: 'Türkiye' },
        { city: 'Ankara', country: 'Türkiye' },
        { city: 'İzmir', country: 'Türkiye' },
        { city: 'Bursa', country: 'Türkiye' },
        { city: 'Antalya', country: 'Türkiye' },
        { city: 'Adana', country: 'Türkiye' },
        { city: 'Konya', country: 'Türkiye' },
      ].filter(loc => loc.city.toLowerCase().includes(value.toLowerCase()));
      
      setLocationSuggestions(suggestions);
      setShowLocationSuggestions(suggestions.length > 0);
    } else {
      setShowLocationSuggestions(false);
    }
  };

  // Lokasyon önerisi seçme
  const handleSelectLocation = (suggestion: LocationSuggestion) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        city: suggestion.city,
        country: suggestion.country
      }
    }));
    setShowLocationSuggestions(false);
  };

  // İlgilendiği cinsiyeti güncelleme
  const handleInterestedInToggle = (gender: string) => {
    setFormData(prev => {
      const current = [...prev.interested_in];
      const index = current.indexOf(gender);
      
      if (index >= 0) {
        current.splice(index, 1);
      } else {
        current.push(gender);
      }
      
      return {
        ...prev,
        interested_in: current
      };
    });
  };

  // Hobi seçimini güncelleme
  const handleToggleHobby = (hobby: string) => {
    setFormData(prev => {
      const current = [...prev.hobbies];
      const index = current.indexOf(hobby);
      
      if (index >= 0) {
        current.splice(index, 1);
      } else {
        if (current.length >= 5) {
          Alert.alert('Uyarı', 'En fazla 5 hobi seçebilirsin');
          return prev;
        }
        current.push(hobby);
      }
      
      return {
        ...prev,
        hobbies: current
      };
    });
  };

  // Fotoğraf ekleme - Photo Picker kullanım
  const handleAddPhoto = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Photo Picker API 33+ ile otomatik kullanılır, permission kontrolü gereksiz
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        aspect: [3, 4],
        exif: false,
        base64: false,
        allowsMultipleSelection: false
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        // Mevcut fotoğrafları kontrol et
        if (formData.photos.length >= 6) {
          Alert.alert('Uyarı', 'En fazla 6 fotoğraf ekleyebilirsiniz.');
          return;
        }
        
        // Yükleniyor göstergesi eklenebilir
        const newPhotos = [...formData.photos, selectedAsset.uri];
        
        setFormData(prev => ({
          ...prev,
          photos: newPhotos,
          profile_photo: prev.profile_photo || newPhotos[0]
        }));
      }
    } catch (error) {
      console.error('Fotoğraf ekleme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf eklenirken bir hata oluştu.');
    }
  };

  // Fotoğraf silme
  const handleRemovePhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Fotoğrafı Sil',
      'Bu fotoğrafı silmek istediğinize emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            const newPhotos = [...formData.photos];
            newPhotos.splice(index, 1);
            
            let newProfilePhoto = formData.profile_photo;
            if (formData.profile_photo === formData.photos[index]) {
              newProfilePhoto = newPhotos.length > 0 ? newPhotos[0] : '';
            }
            
            setFormData(prev => ({
              ...prev,
              photos: newPhotos,
              profile_photo: newProfilePhoto
            }));
          }
        }
      ]
    );
  };

  // Profil fotoğrafı ayarlama
  const handleSetProfilePhoto = (photoUrl: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Profil fotoğrafını güncelle
    setFormData(prev => ({
      ...prev,
      profile_photo: photoUrl
    }));
    
    // Kullanıcıya bildirim göster
    Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi');
  };

  // Formu kaydet
  const handleSaveProfile = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Form doğrulama
      if (!formData.first_name.trim()) {
        Alert.alert('Uyarı', 'Lütfen adınızı girin');
        return;
      }
      
      if (!formData.last_name.trim()) {
        Alert.alert('Uyarı', 'Lütfen soyadınızı girin');
        return;
      }
      
      if (!formData.gender) {
        Alert.alert('Uyarı', 'Lütfen cinsiyetinizi seçin');
        return;
      }
      
      if (formData.interested_in.length === 0) {
        Alert.alert('Uyarı', 'Lütfen ilgilendiğiniz cinsiyet(ler)i seçin');
        return;
      }
      
      setIsSaving(true);

      // Profil bilgilerini güncelle
      const { error } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          gender: formData.gender,
          interested_in: formData.interested_in,
          biography: formData.biography,
          birth_date: formData.birth_date ? formData.birth_date.toISOString() : null,
          photos: formData.photos,
          profile_photo: formData.profile_photo,
          location: formData.location,
          hobbies: formData.hobbies,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) {
        console.error('Profil güncelleme hatası:', error);
        Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu');
        return;
      }
      
      // UserContext'teki kullanıcı verilerini yenile
      if (refetchUserData) {
        await refetchUserData();
      }
      
      Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi');
      navigation.goBack();
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  // Geri dön
  const handleGoBack = () => {
    navigation.goBack();
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Tarih seçiniz';
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
  };

  // Date Picker Modal kısmını değiştirin
  const handleDateChange = (event: any, selectedDate?: Date) => {
    const { type } = event;
    
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (type === 'set' || Platform.OS === 'android') {
      if (selectedDate) {
        handleInputChange('birth_date', selectedDate);
      }
    }
    
    if (Platform.OS === 'android' || type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  // iOS için tarih seçici modalı
  const renderIOSDatePicker = () => {
    if (!showDatePicker || Platform.OS !== 'ios') return null;
    
    return (
      <Modal
        transparent={true}
        animationType="slide"
        visible={showDatePicker}
      >
        <View style={styles.modalContainer}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity 
                onPress={() => setShowDatePicker(false)}
                style={styles.datePickerButton}
              >
                <Text style={styles.datePickerCancelText}>İptal</Text>
              </TouchableOpacity>
              
              <Text style={styles.datePickerTitle}>Doğum Tarihi</Text>
              
              <TouchableOpacity 
                onPress={() => {
                  // Mevcut seçili tarihi onayla
                  setShowDatePicker(false);
                }}
                style={styles.datePickerButton}
              >
                <Text style={styles.datePickerConfirmText}>Tamam</Text>
              </TouchableOpacity>
            </View>
            
            <RNDateTimePicker
              value={formData.birth_date || new Date()}
              mode="date"
              display="spinner"
              onChange={(event, date) => {
                if (date) {
                  handleInputChange('birth_date', date);
                }
              }}
              maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
              minimumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 100))}
              themeVariant="dark"
              style={styles.iOSDatePicker}
            />
          </View>
        </View>
      </Modal>
    );
  };

  // Fotoğrafları render eden memoize edilmiş bileşen
  const renderPhotos = useMemo(() => (
    <View style={styles.photosContainer}>
      {formData.photos.map((photo, index) => (
        <TouchableOpacity 
          key={index}
          style={[
            styles.photoItem,
            photo === formData.profile_photo && styles.selectedPhotoItem
          ]}
          onPress={() => handleSetProfilePhoto(photo)}
          onLongPress={() => handleRemovePhoto(index)}
          activeOpacity={0.8}
        >
          <MemoizedImage uri={photo} style={styles.photoImage} />
          
          {photo === formData.profile_photo ? (
            <View style={styles.profilePhotoBadgeContainer}>
              <View style={styles.profilePhotoBadge}>
                <MaterialCommunityIcons 
                  name="star-circle" 
                  size={20} 
                  color="#FFFFFF" 
                />
              </View>
              <Text style={styles.profilePhotoText}>Profil Fotoğrafı</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.makeProfilePhotoButton}
              onPress={() => handleSetProfilePhoto(photo)}
            >
              <Text style={styles.makeProfilePhotoText}>Profil Fotoğrafı Yap</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.removePhotoButton}
            onPress={() => handleRemovePhoto(index)}
          >
            <MaterialCommunityIcons 
              name="close-circle" 
              size={20} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
      
      {formData.photos.length < 6 && (
        <TouchableOpacity 
          style={styles.addPhotoButton}
          onPress={handleAddPhoto}
        >
          <MaterialCommunityIcons 
            name="camera-plus" 
            size={28} 
            color={COLORS.dark.textSecondary} 
          />
        </TouchableOpacity>
      )}
    </View>
  ), [formData.photos, formData.profile_photo]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#121212' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" translucent={false} />
      <LinearGradient
        colors={['#1A1A1A', '#121212']}
        style={[styles.container, keyboardVisible && Platform.OS === 'android' && styles.keyboardAvoidContainer]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 15 : 25 }]}>
            <View style={styles.headerContent}>
              <TouchableOpacity 
                onPress={handleGoBack}
                style={styles.backButton}
              >
                <MaterialCommunityIcons 
                  name="arrow-left" 
                  size={24} 
                  color={COLORS.dark.text} 
                />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Profili Düzenle</Text>
              <TouchableOpacity 
                onPress={handleSaveProfile}
                style={styles.saveButton}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={COLORS.dark.primary} />
                ) : (
                  <MaterialCommunityIcons 
                    name="check" 
                    size={24} 
                    color={COLORS.dark.primary} 
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.dark.primary} />
              <Text style={styles.loadingText}>Bilgiler yükleniyor...</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.content}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContent, 
                keyboardVisible && Platform.OS === 'android' && { paddingBottom: 280 }
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              {/* Fotoğraflar */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fotoğraflar</Text>
                <Text style={styles.sectionDescription}>
                  En fazla 6 fotoğraf ekleyebilirsiniz. İlk fotoğraf profil fotoğrafı olarak görüntülenecektir.
                </Text>
                
                {renderPhotos}
              </View>

              {/* Kişisel Bilgiler */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
                
                {/* Ad */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ad</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.first_name}
                    onChangeText={(text) => handleInputChange('first_name', text)}
                    placeholder="Adınız"
                    placeholderTextColor={COLORS.dark.textSecondary}
                    selectionColor={COLORS.dark.primary}
                  />
                </View>
                
                {/* Soyad */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Soyad</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.last_name}
                    onChangeText={(text) => handleInputChange('last_name', text)}
                    placeholder="Soyadınız"
                    placeholderTextColor={COLORS.dark.textSecondary}
                    selectionColor={COLORS.dark.primary}
                  />
                </View>

                {/* Doğum Tarihi */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Doğum Tarihi</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.datePickerButtonText}>
                      {formData.birth_date ? formatDate(formData.birth_date) : 'Doğum tarihinizi seçin'}
                    </Text>
                    <MaterialCommunityIcons 
                      name="calendar" 
                      size={20} 
                      color={COLORS.dark.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>

                {/* Konum */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Şehir</Text>
                  <View style={styles.locationInputContainer}>
                    <TextInput
                      style={styles.input}
                      value={formData.location.city}
                      onChangeText={(text) => handleLocationChange('city', text)}
                      placeholder="Şehir"
                      placeholderTextColor={COLORS.dark.textSecondary}
                      selectionColor={COLORS.dark.primary}
                    />
                    {showLocationSuggestions && (
                      <View style={styles.locationSuggestions}>
                        {locationSuggestions.map((suggestion, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.locationSuggestionItem}
                            onPress={() => handleSelectLocation(suggestion)}
                          >
                            <Text style={styles.locationSuggestionText}>
                              {suggestion.city}, {suggestion.country}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ülke</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.location.country}
                    onChangeText={(text) => handleLocationChange('country', text)}
                    placeholder="Ülke"
                    placeholderTextColor={COLORS.dark.textSecondary}
                    selectionColor={COLORS.dark.primary}
                  />
                </View>

                {/* Cinsiyet */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Cinsiyet</Text>
                  <View style={styles.genderOptions}>
                    {GENDER_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.genderOption,
                          formData.gender === option.id && styles.genderOptionSelected
                        ]}
                        onPress={() => handleInputChange('gender', option.id)}
                      >
                        <MaterialCommunityIcons
                          name={option.icon as any}
                          size={20}
                          color={formData.gender === option.id ? '#FFFFFF' : COLORS.dark.textSecondary}
                        />
                        <Text style={[
                          styles.genderOptionText,
                          formData.gender === option.id && styles.genderOptionTextSelected
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* İlgilendiği Cinsiyet */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>İlgilendiğin Cinsiyet</Text>
                  <View style={styles.genderOptions}>
                    {GENDER_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.genderOption,
                          formData.interested_in.includes(option.id) && styles.genderOptionSelected
                        ]}
                        onPress={() => handleInterestedInToggle(option.id)}
                      >
                        <MaterialCommunityIcons
                          name={option.icon as any}
                          size={20}
                          color={formData.interested_in.includes(option.id) ? '#FFFFFF' : COLORS.dark.textSecondary}
                        />
                        <Text style={[
                          styles.genderOptionText,
                          formData.interested_in.includes(option.id) && styles.genderOptionTextSelected
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Biyografi */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hakkında</Text>
                <TextInput
                  style={styles.bioInput}
                  value={formData.biography}
                  onChangeText={(text) => handleInputChange('biography', text)}
                  placeholder="Kendini tanıt..."
                  placeholderTextColor={COLORS.dark.textSecondary}
                  multiline
                  textAlignVertical="top"
                  numberOfLines={4}
                  maxLength={500}
                  selectionColor={COLORS.dark.primary}
                />
                <Text style={styles.charCount}>
                  {formData.biography?.length || 0}/500
                </Text>
              </View>

              {/* Hobiler */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>İlgi Alanları</Text>
                <Text style={styles.sectionDescription}>
                  En fazla 5 ilgi alanı seçebilirsiniz.
                </Text>
                
                {fetchingHobbies ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.dark.primary} />
                    <Text style={styles.loadingText}>Hobiler yükleniyor...</Text>
                  </View>
                ) : (
                  <View style={styles.hobbiesContainer}>
                    {hobbies.map((hobby) => (
                      <TouchableOpacity
                        key={hobby.name}
                        style={[
                          styles.hobbyChip,
                          formData.hobbies.includes(hobby.name) && styles.hobbyChipSelected
                        ]}
                        onPress={() => handleToggleHobby(hobby.name)}
                      >
                        <MaterialCommunityIcons
                          name={hobby.icon as any}
                          size={16}
                          color={formData.hobbies.includes(hobby.name) ? '#FFFFFF' : COLORS.dark.textSecondary}
                          style={styles.hobbyIcon}
                        />
                        <Text style={[
                          styles.hobbyText,
                          formData.hobbies.includes(hobby.name) && styles.hobbyTextSelected
                        ]}>
                          {hobby.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Kaydet Butonu */}
              <TouchableOpacity
                style={styles.saveProfileButton}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                <LinearGradient
                  colors={COLORS.dark.gradient.primary}
                  style={styles.saveButtonGradient}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons 
                        name="content-save" 
                        size={20} 
                        color="#FFFFFF" 
                        style={styles.saveButtonIcon} 
                      />
                      <Text style={styles.saveButtonText}>Değişiklikleri Kaydet</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Android için DatePicker */}
          {showDatePicker && Platform.OS === 'android' && (
            <RNDateTimePicker
              value={formData.birth_date || new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
              minimumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 100))}
            />
          )}
          
          {/* iOS için DatePicker Modal */}
          {renderIOSDatePicker()}
        </SafeAreaView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(26,26,26,0.98)',
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.dark.text,
  },
  backButton: {
    padding: SPACING.xs,
    borderRadius: 20,
  },
  saveButton: {
    padding: SPACING.xs,
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.dark.textSecondary,
  },
  section: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark.text,
    marginBottom: SPACING.xs,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.dark.textSecondary,
    marginBottom: SPACING.md,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
  },
  photoItem: {
    width: (SPACING.md * 2) + 100,
    height: (SPACING.md * 2) + 120,
    margin: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.medium,
  },
  selectedPhotoItem: {
    borderWidth: 2,
    borderColor: COLORS.dark.primary,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E1E1E', // Yüklenmeden önce arka plan rengi
  },
  profilePhotoBadgeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePhotoBadge: {
    backgroundColor: COLORS.dark.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  profilePhotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  makeProfilePhotoButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  makeProfilePhotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,71,87,0.8)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    width: (SPACING.md * 2) + 100,
    height: (SPACING.md * 2) + 120,
    margin: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.dark.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.dark.text,
    fontSize: 16,
    ...(Platform.OS === 'android' && {
      textAlignVertical: 'center',
    }),
  },
  bioInput: {
    backgroundColor: COLORS.dark.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.dark.text,
    fontSize: 16,
    height: 120,
    ...(Platform.OS === 'android' && {
      textAlignVertical: 'top',
    }),
  },
  charCount: {
    fontSize: 12,
    color: COLORS.dark.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  datePickerButton: {
    backgroundColor: COLORS.dark.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerButtonText: {
    color: COLORS.dark.text,
    fontSize: 16,
  },
  locationInputContainer: {
    position: 'relative',
    zIndex: 1,
  },
  locationSuggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.dark.surface,
    borderRadius: BORDER_RADIUS.md,
    marginTop: 4,
    maxHeight: 150,
    overflow: 'hidden',
    ...SHADOWS.medium,
    zIndex: 2,
  },
  locationSuggestionItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  locationSuggestionText: {
    color: COLORS.dark.text,
    fontSize: 14,
  },
  genderOptions: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.dark.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderOptionSelected: {
    backgroundColor: COLORS.dark.primary,
  },
  genderOptionText: {
    color: COLORS.dark.text,
    fontSize: 14,
    marginLeft: 4,
  },
  genderOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  hobbiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
  },
  hobbyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dark.surface,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  hobbyChipSelected: {
    backgroundColor: COLORS.dark.primary,
  },
  hobbyIcon: {
    marginRight: 4,
  },
  hobbyText: {
    color: COLORS.dark.text,
    fontSize: 14,
  },
  hobbyTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  saveProfileButton: {
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  saveButtonIcon: {
    marginRight: SPACING.sm,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // DatePicker Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  datePickerContainer: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    paddingBottom: SPACING.xl,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark.text,
  },
  datePickerCancelText: {
    fontSize: 16,
    color: COLORS.dark.textSecondary,
  },
  datePickerConfirmText: {
    fontSize: 16,
    color: COLORS.dark.primary,
    fontWeight: '600',
  },
  iOSDatePicker: {
    height: 200,
    width: '100%',
  },
  keyboardAvoidContainer: {
    backgroundColor: '#121212',
  },
}); 