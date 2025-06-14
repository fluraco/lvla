import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-elements';
import { useRegister } from '../../../contexts/RegisterContext';
import { SPACING, COLORS } from '../../../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RegisterStepLayout } from './RegisterStepLayout';
import { supabase } from '../../../lib/supabase';

// Sabit hobi listesi - fallback için
const PREDEFINED_HOBBIES = [
  { name: 'Seyahat', icon: 'airplane' as const },
  { name: 'Fotoğraf', icon: 'camera' as const },
  { name: 'Müzik', icon: 'music' as const },
  { name: 'Sinema', icon: 'movie' as const },
  { name: 'Spor', icon: 'basketball' as const },
  { name: 'Yemek', icon: 'food' as const },
  { name: 'Dans', icon: 'dance-ballroom' as const },
  { name: 'Kitap', icon: 'book-open-page-variant' as const },
  { name: 'Yoga', icon: 'yoga' as const },
  { name: 'Doğa', icon: 'hiking' as const },
  { name: 'Resim', icon: 'palette' as const },
  { name: 'Oyun', icon: 'gamepad-variant' as const },
  { name: 'Fitness', icon: 'dumbbell' as const },
  { name: 'Yüzme', icon: 'swim' as const },
  { name: 'Bisiklet', icon: 'bike' as const },
  { name: 'Kamp', icon: 'tent' as const },
  { name: 'Tiyatro', icon: 'theater' as const },
  { name: 'Bahçe', icon: 'flower' as const },
  { name: 'Dalınç', icon: 'meditation' as const },
  { name: 'Koleksiyon', icon: 'archive' as const },
];

interface HobbyItem {
  name: string;
  icon: string;
}

// Icon tipini MaterialCommunityIcons tipine dönüştürmek için yardımcı fonksiyon
const getIconName = (iconName: string) => {
  // Tip kontrolü - varsayılan olarak 'circle' icon'u kullan
  const validIconNames = new Set(PREDEFINED_HOBBIES.map(h => h.icon));
  return validIconNames.has(iconName as any) ? iconName : 'circle';
};

export function HobbiesStep() {
  const { state, dispatch } = useRegister();
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>(state.hobbies);
  const [loading, setLoading] = useState(false);
  const [fetchingHobbies, setFetchingHobbies] = useState(true);
  const [hobbies, setHobbies] = useState<HobbyItem[]>(PREDEFINED_HOBBIES);

  useEffect(() => {
    fetchHobbies();
  }, []);

  const fetchHobbies = async () => {
    setFetchingHobbies(true);
    try {
      // Önce tablo varsa kontrol et
      const { error: checkError } = await supabase
        .from('hobby_categories')
        .select('count', { count: 'exact', head: true });

      if (checkError && checkError.code === '42P01') {
        // Tablo yoksa sabit listemizi kullan
        console.log('Hobi tablosu bulunamadı, sabit liste kullanılıyor');
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

  const handleToggleHobby = (hobby: string) => {
    setSelectedHobbies((prev) => {
      if (prev.includes(hobby)) {
        return prev.filter((h) => h !== hobby);
      }
      if (prev.length >= 5) {
        Alert.alert('Uyarı', 'En fazla 5 hobi seçebilirsin');
        return prev;
      }
      return [...prev, hobby];
    });
  };

  const handleNext = async () => {
    if (selectedHobbies.length === 0) {
      Alert.alert('Uyarı', 'En az bir hobi seçmelisin');
      return;
    }
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      dispatch({ type: 'SET_HOBBIES', payload: selectedHobbies });
      dispatch({ type: 'NEXT_STEP' });
    } catch (error) {
      console.error('Hobi kaydetme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RegisterStepLayout
      title="Nelerden hoşlanıyorsun?"
      subtitle="Sana en uygun eşleşmeleri gösterebilmemiz için ilgi alanlarını seç"
      currentStep={5}
      totalSteps={8}
      onNext={handleNext}
      isNextDisabled={selectedHobbies.length === 0}
      loading={loading}
    >
      {fetchingHobbies ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.light.primary} />
          <Text style={styles.loadingText}>Hobiler yükleniyor...</Text>
        </View>
      ) : (
        <View style={styles.hobbiesContainer}>
          {hobbies.map((hobby) => (
            <View
              key={hobby.name}
              style={styles.hobbyWrapper}
            >
              <TouchableOpacity
                style={[
                  styles.hobbyItem,
                  selectedHobbies.includes(hobby.name) && styles.hobbyItemSelected
                ]}
                onPress={() => handleToggleHobby(hobby.name)}
              >
                <MaterialCommunityIcons
                  name={getIconName(hobby.icon) as any}
                  size={24}
                  color={selectedHobbies.includes(hobby.name) ? '#FFFFFF' : '#666666'}
                  style={styles.hobbyIcon}
                />
                <Text style={[
                  styles.hobbyText,
                  selectedHobbies.includes(hobby.name) && styles.hobbyTextSelected
                ]}>
                  {hobby.name}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </RegisterStepLayout>
  );
}

const styles = StyleSheet.create({
  hobbiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
  },
  hobbyWrapper: {
    width: '50%',
    padding: SPACING.xs,
  },
  hobbyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: SPACING.lg,
    minHeight: 56,
  },
  hobbyItemSelected: {
    backgroundColor: '#0066FF',
  },
  hobbyIcon: {
    marginRight: SPACING.md,
  },
  hobbyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
    flex: 1,
  },
  hobbyTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: '#666666',
  },
}); 