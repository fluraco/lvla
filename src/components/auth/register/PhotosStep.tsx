import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Modal,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Text, Button } from 'react-native-elements';
import * as ImagePicker from 'expo-image-picker';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useRegister } from '../../../contexts/RegisterContext';
import { useUser } from '../../../contexts/UserContext';
import { SPACING, BORDER_RADIUS, COLORS } from '../../../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { uploadImageAsync } from '../../../utils/imageUpload';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 6;

interface Photo {
  uri: string;
  orderIndex: number;
}

const getPhotoTitle = (index: number): string => {
  if (index === 0) return 'Profil Fotoğrafı';
  const titles = ['İkinci Fotoğraf', 'Üçüncü Fotoğraf', 'Dördüncü Fotoğraf', 'Beşinci Fotoğraf', 'Altıncı Fotoğraf'];
  return titles[index - 1];
};

export function PhotosStep() {
  const { state, dispatch } = useRegister();
  const { setUser } = useUser();
  const [photos, setPhotos] = useState<Photo[]>(state.photos || []);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // İnternet bağlantısını kontrol et
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const pickImage = async () => {
    // Photo Picker API 33+ ile otomatik kullanılır, permission kontrolü gereksiz

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        exif: false,
        base64: false,
        allowsMultipleSelection: false
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        if (photos.length >= MAX_PHOTOS) {
          Alert.alert('Maksimum Fotoğraf', `En fazla ${MAX_PHOTOS} fotoğraf yükleyebilirsin.`);
          return;
        }

        const newPhoto: Photo = {
          uri: result.assets[0].uri,
          orderIndex: photos.length,
        };

        setPhotos([...photos, newPhoto]);
      }
    } catch (error) {
      console.error('Fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const removePhoto = (index: number) => {
    Alert.alert(
      'Fotoğrafı Sil',
      'Bu fotoğrafı silmek istediğine emin misin?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            const photoToRemove = photos[index];
            const newPhotos = photos.filter(photo => photo.uri !== photoToRemove.uri);
            // Kalan fotoğrafların sırasını güncelle
            const updatedPhotos = newPhotos.map((photo, idx) => ({
              ...photo,
              orderIndex: idx,
            }));
            setPhotos(updatedPhotos);
          },
        },
      ]
    );
  };

  const handleNext = async () => {
    if (photos.length < MIN_PHOTOS) {
      Alert.alert('Hata', `En az ${MIN_PHOTOS} fotoğraf yüklemelisiniz.`);
      return;
    }

    // İnternet bağlantısını kontrol et
    if (!isConnected) {
      Alert.alert(
        'Bağlantı Hatası',
        'İnternet bağlantınız yok. Lütfen bağlantınızı kontrol edip tekrar deneyin.'
      );
      return;
    }

    setLoading(true);

    try {
      // Debug modunda konsola bilgi yazdır
      console.log(`${photos.length} fotoğraf yükleniyor...`);

      // Fotoğrafları ayrı ayrı yükleyelim ve hatayı yönetelim
      const photoUrls: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        try {
          const photo = photos[i];
          console.log(`Fotoğraf ${i+1}/${photos.length} yükleniyor...`);
          
          // Telefon numarası temizleme işlemi
          const cleanPhoneNumber = state.phoneNumber.replace(/\+/g, '').replace(/\s/g, '');
          const fileName = `user_${cleanPhoneNumber}_photo_${i}_${Date.now()}.jpg`;
          
          // Her fotoğraf için 3 deneme yapalım
          let retries = 3;
          let uploadSuccess = false;
          let lastError;
          
          while (retries > 0 && !uploadSuccess) {
            try {
              const { url } = await uploadImageAsync(photo.uri, fileName, 'user-photos');
              photoUrls.push(url);
              uploadSuccess = true;
              console.log(`Fotoğraf ${i+1} başarıyla yüklendi: ${url}`);
            } catch (err) {
              lastError = err;
              retries--;
              console.warn(`Fotoğraf ${i+1} yükleme başarısız. Kalan deneme: ${retries}`);
              // Yalnızca son denemede değilse 2 sn bekle
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
          }
          
          // Tüm denemeler başarısız olursa hata fırlat
          if (!uploadSuccess) {
            throw lastError || new Error(`Fotoğraf ${i+1} yüklenemedi`);
          }
        } catch (err) {
          console.error(`Fotoğraf ${i+1} yükleme hatası:`, err);
          throw new Error(`Fotoğraf ${i+1} yüklenirken hata oluştu: ${err.message || 'Bilinmeyen hata'}`);
        }
      }

      // Tüm fotoğraflar başarıyla yüklendiyse devam et
      if (photoUrls.length !== photos.length) {
        throw new Error(`Bazı fotoğraflar yüklenemedi. Yüklenen: ${photoUrls.length}/${photos.length}`);
      }

      // Telefon numarasını formatla
      const formattedPhoneNumber = state.phoneNumber.startsWith('+90') 
        ? state.phoneNumber 
        : `+90${state.phoneNumber}`;

      // Kullanıcı verilerini hazırla
      const userData = {
        phone_number: formattedPhoneNumber,
        first_name: state.firstName,
        last_name: state.lastName,
        gender: state.gender,
        interested_in: state.interestedIn,
        location: state.location,
        hobbies: state.hobbies,
        biography: state.biography,
        birth_date: state.birthDate?.toISOString(),
        photos: photoUrls,
        profile_photo: photoUrls[0],
        looking_for: state.interestedIn,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('Kullanıcı kaydı yapılıyor...');

      try {
        // Supabase'e kullanıcı kaydı için timeout ekleyelim
        const insertPromise = supabase
          .from('users')
          .insert([userData])
          .select()
          .single();
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Kullanıcı kaydı zaman aşımına uğradı')), 10000)
        );
        
        const { data, error } = await Promise.race([insertPromise, timeoutPromise]) as any;

        if (error) {
          if (error.message?.includes('timeout') || 
              error.message?.includes('network') || 
              error.message?.includes('connection') ||
              error.code === 'ECONNABORTED') {
            throw new Error('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
          } else {
            throw error;
          }
        }

        console.log('Kullanıcı kaydı başarılı!');

        // UserContext'i güncelle
        setUser({
          id: data.id,
          name: `${data.first_name} ${data.last_name}`,
          email: data.email || '',
          location: data.location,
          profileImage: data.profile_photo
        });

        // Başarılı kayıt
        dispatch({ type: 'COMPLETE_REGISTRATION', payload: data });
        navigation.replace('MainTabs');
      } catch (dbError) {
        console.error('Veritabanı işlem hatası:', dbError);
        throw new Error(dbError.message || 'Kullanıcı kaydı yapılırken bir hata oluştu.');
      }

    } catch (error) {
      console.error('Kayıt hatası:', error);
      Alert.alert(
        'Hata',
        error instanceof Error 
          ? error.message 
          : 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderPhotoItem = ({ item, index, drag, isActive }: RenderItemParams<Photo>) => {
    return (
      <ScaleDecorator>
        <View style={[styles.photoListItem, isActive && styles.photoListItemActive]}>
          {index === 0 && (
            <View style={styles.profilePhotoTag}>
              <Text style={styles.profilePhotoText}>Profil Fotoğrafı</Text>
            </View>
          )}
          <View style={styles.photoContent}>
            <TouchableOpacity 
              onPress={() => setSelectedImage(item.uri)}
              style={styles.thumbnailContainer}
            >
              <Image
                source={{ uri: item.uri }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
            <View style={styles.photoInfo}>
              <Text style={styles.photoTitle}>{getPhotoTitle(index)}</Text>
              <Text style={styles.photoHint}>Sıralamak için basılı tut</Text>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removePhoto(index)}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={24}
                color={COLORS.error}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.dragHandle}
            onLongPress={drag}
          >
            <MaterialCommunityIcons
              name="drag"
              size={24}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    );
  };

  const renderAddPhotoButton = () => {
    if (photos.length >= MAX_PHOTOS) return null;

    return (
      <TouchableOpacity
        style={styles.addPhotoButton}
        onPress={pickImage}
      >
        <MaterialCommunityIcons
          name="image-plus"
          size={24}
          color={COLORS.primary}
        />
        <Text style={styles.addPhotoText}>Yeni Fotoğraf Ekle</Text>
      </TouchableOpacity>
    );
  };

  const renderImagePreview = () => {
    if (!selectedImage) return null;

    return (
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setSelectedImage(null)}
        >
          <View style={styles.modalContent}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          </View>
        </Pressable>
      </Modal>
    );
  };

  return (
    <SafeAreaView 
      style={styles.safeArea}
      edges={['left', 'right']} // Top ve bottom edge'leri yoksay
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      <View style={styles.mainContainer}>
        <View style={[
          styles.header,
          { paddingTop: Platform.OS === 'android' ? insets.top + SPACING.lg : SPACING.md }
        ]}>
          <Text style={styles.title}>Fotoğraflarını Ekle</Text>
          <Text style={styles.subtitle}>
            En az {MIN_PHOTOS} fotoğraf ekle ve sırala. Profil fotoğrafın ilk sırada olsun.
          </Text>
        </View>

        <View style={styles.contentContainer}>
          <DraggableFlatList
            data={photos}
            onDragEnd={({ data }) => setPhotos(data)}
            keyExtractor={(item) => item.uri}
            renderItem={renderPhotoItem}
            contentContainerStyle={styles.listContainer}
            ListFooterComponent={renderAddPhotoButton}
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            bounces={false}
            overScrollMode="never"
            ListFooterComponentStyle={styles.footerStyle}
          />
        </View>

        {renderImagePreview()}

        <View style={[
          styles.bottomBar, 
          { paddingBottom: Platform.OS === 'android' ? insets.bottom + SPACING.md : insets.bottom || SPACING.xl }
        ]}>
          <View style={styles.photoCountContainer}>
            <Text style={styles.photoCount}>
              {photos.length} / {MAX_PHOTOS} Fotoğraf
            </Text>
          </View>
          <Button
            title={loading ? "" : "Devam Et"}
            onPress={handleNext}
            disabled={photos.length < MIN_PHOTOS || loading}
            loading={loading}
            loadingProps={{ color: 'white' }}
            buttonStyle={[
              styles.continueButton,
              (photos.length < MIN_PHOTOS || loading) && styles.continueButtonDisabled
            ]}
            titleStyle={styles.continueButtonTitle}
            containerStyle={styles.continueButtonContainer}
            icon={loading ? 
              <ActivityIndicator color="white" size="small" /> : 
              undefined
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
    marginTop: SPACING.md,
    paddingBottom: Platform.OS === 'android' ? 120 : 80, // Android için daha fazla boşluk
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
    // Android için top padding zaten useSafeAreaInsets ile düzenlendi
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl * 2,
  },
  footerStyle: {
    paddingBottom: SPACING.xl * 2,
  },
  photoListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    elevation: Platform.OS === 'android' ? 2 : 0,
    shadowColor: Platform.OS === 'ios' ? '#000' : 'transparent',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  photoListItemActive: {
    backgroundColor: '#FFFFFF',
    elevation: 5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 999,
  },
  photoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailContainer: {
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: 60,
    height: 80,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
  },
  photoInfo: {
    flex: 1,
    paddingHorizontal: SPACING.xs,
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  photoHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  dragHandle: {
    padding: SPACING.xs,
    alignSelf: 'center',
  },
  removeButton: {
    padding: SPACING.xs,
    marginLeft: 'auto',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  addPhotoText: {
    marginLeft: SPACING.sm,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: 'transparent',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  profilePhotoTag: {
    position: 'absolute',
    top: -10,
    left: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    zIndex: 1,
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  profilePhotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? SPACING.md : SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: Platform.OS === 'android' ? 8 : 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  photoCountContainer: {
    flex: 1,
    marginRight: SPACING.md,
  },
  photoCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  continueButton: {
    backgroundColor: '#0066FF',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 120,
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.disabled,
    opacity: 0.7,
  },
  continueButtonTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonContainer: {
    borderRadius: BORDER_RADIUS.md,
  },
}); 