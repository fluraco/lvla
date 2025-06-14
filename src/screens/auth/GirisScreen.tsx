import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-elements';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PhoneInput } from '../../components/auth/PhoneInput';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../theme';
import Animated, {
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { useGoogleAuth } from '../../services/google-auth';
import { generateAndSendOTP } from '../../services/netgsm';
import { supabase } from '../../lib/supabase';
import { useRegister } from '../../contexts/RegisterContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Giris'>;

export function GirisScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signInWithGoogle } = useGoogleAuth();
  const { dispatch } = useRegister();

  const handlePhoneLogin = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Hata', 'Lütfen geçerli bir telefon numarası giriniz.');
      return;
    }

    setLoading(true);
    try {
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
      
      const formattedNumber = cleanPhoneNumber.startsWith('0') 
        ? cleanPhoneNumber.slice(1) 
        : cleanPhoneNumber;

      await generateAndSendOTP(formattedNumber);
      navigation.navigate('Otp', { phoneNumber: formattedNumber });
    } catch (error) {
      if (error instanceof Error) {
        console.error('SMS gönderme hatası:', error.message);
        Alert.alert(
          'Hata',
          'SMS gönderilemedi. Lütfen tekrar deneyin.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      
      // "Çok yakında yayında" mesajını göster
      Alert.alert(
        'Çok Yakında Yayında',
        'Google ile giriş özelliği çok yakında aktif olacaktır. Lütfen telefon numaranızla giriş yapınız.',
        [{ text: 'Tamam', onPress: () => setGoogleLoading(false) }]
      );
      
      // Aşağıdaki Google giriş kodu kullanılmıyor, ama altyapısı bozulmadan korunuyor
      /*
      // Google ile giriş yap ve kullanıcı verilerini al
      const result = await signInWithGoogle();
      
      if (!result || !result.user) {
        throw new Error('Google ile giriş yapılamadı');
      }
      
      const googleUser = result.user;
      
      // Kullanıcının Google ID'si ile veritabanında var olup olmadığını kontrol et
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', googleUser.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116: Bulunamadı hatası
        console.error('Kullanıcı sorgusu hatası:', error);
        throw new Error('Kullanıcı sorgusu sırasında bir hata oluştu');
      }
      
      if (existingUser) {
        // Kullanıcı zaten kayıtlı, ana sayfaya yönlendir
        console.log('Mevcut Google kullanıcısı giriş yaptı:', existingUser.id);
        
        // Supabase oturumunu güncelle (gerekirse)
        await supabase.auth.updateUser({
          data: { last_login: new Date().toISOString() }
        });
        
        // Ana sayfaya yönlendir
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' as any }]
        });
      } else {
        // Kullanıcı kayıtlı değil, kayıt sürecine başlat
        console.log('Yeni Google kullanıcısı, kayıt sürecine yönlendiriliyor');
        
        // RegisterContext'i güncelle - Google bilgilerini ekle
        dispatch({
          type: 'SET_GOOGLE_USER',
          payload: {
            googleId: googleUser.id,
            email: googleUser.email || '',
            firstName: googleUser.givenName || googleUser.displayName?.split(' ')[0] || '',
            lastName: googleUser.familyName || googleUser.displayName?.split(' ').slice(1).join(' ') || '',
            profilePhoto: googleUser.photoURL || ''
          }
        });
        
        // Kayıt sürecini başlat - Eğer Google'dan isim bilgisi geldiyse
        // isimleri zaten context'e aktardık, yine de NamesStep'e yönlendir
        navigation.navigate('Register' as any, { initialStep: 'names' });
      }
      */
    } catch (error) {
      console.error('Google ile giriş hatası:', error);
      Alert.alert('Hata', 'Google ile giriş yapılırken bir hata oluştu.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
        </View>

        <Animated.View 
          entering={FadeInDown.delay(200).springify()}
          style={styles.titleContainer}
        >
          <Text style={styles.title}>Lovla'ya Hoş geldin</Text>
          <Text style={styles.subtitle}>
            Telefon numaranla devam et veya hesabınla giriş yap.
          </Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(400).springify()}
          style={styles.formContainer}
        >
          <PhoneInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />

          <TouchableOpacity
            onPress={handlePhoneLogin}
            disabled={!phoneNumber || loading}
            style={[
              styles.continueButton,
              (!phoneNumber || loading) && styles.continueButtonDisabled
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.continueButtonText}>Devam et</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View 
          entering={FadeIn.delay(600)}
          style={styles.dividerContainer}
        >
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(800).springify()}
          style={styles.alternativeLoginContainer}
        >
          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={googleLoading}
            style={[
              styles.alternativeLoginButton,
              googleLoading && styles.alternativeLoginButtonDisabled
            ]}
          >
            {googleLoading ? (
              <ActivityIndicator color="#1a1a1a" size="small" style={styles.socialIcon} />
            ) : (
              <Image
                source={require('../../assets/icons/google-icon.png')}
                style={styles.socialIcon}
              />
            )}
            <Text style={styles.alternativeLoginText}>
              {googleLoading ? 'Google ile işlem yapılıyor...' : 'Google ile devam et'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
  },
  helpButton: {
    padding: SPACING.sm,
  },
  titleContainer: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  formContainer: {
    gap: SPACING.lg,
  },
  continueButton: {
    backgroundColor: '#0066ff',
    borderRadius: BORDER_RADIUS.lg,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  continueButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    color: '#666666',
    marginHorizontal: SPACING.md,
  },
  alternativeLoginContainer: {
    gap: SPACING.md,
  },
  alternativeLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  alternativeLoginButtonDisabled: {
    opacity: 0.7,
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  alternativeLoginText: {
    color: '#1a1a1a',
    marginLeft: SPACING.md,
    fontSize: 16,
    fontWeight: '500',
  },
}); 