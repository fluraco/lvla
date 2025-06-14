import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  TextInput,
} from 'react-native';
import { Text } from 'react-native-elements';
import { verifyOTP, generateAndSendOTP } from '../../services/netgsm';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { useUser } from '../../contexts/UserContext';
import { CommonActions } from '@react-navigation/native';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;

export function OtpScreen({ route, navigation }: Props) {
  const { phoneNumber } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(180); // 3 dakika
  const [canResend, setCanResend] = useState(false);
  const { colors } = useTheme();
  const { setUser } = useUser();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!phoneNumber) {
      navigation.goBack();
      return;
    }
  }, [phoneNumber]);

  // Telefon numarasının kayıtlı olup olmadığını kontrol eden fonksiyon
  const checkUserExists = async (phoneNumber: string) => {
    try {
      // Telefon numarasını formatlayalım
      const formattedPhoneNumber = phoneNumber.startsWith('+90') 
        ? phoneNumber 
        : `+90${phoneNumber}`;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', formattedPhoneNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Kayıt bulunamadı hatası
          return { exists: false, userData: null };
        }
        throw error;
      }

      return { exists: true, userData: data };
    } catch (error) {
      console.error('Kullanıcı kontrolü hatası:', error);
      throw error;
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer <= 1) {
            setCanResend(true);
            clearInterval(interval);
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleResendCode = async () => {
    if (!canResend) return;
    
    try {
      setLoading(true);
      await generateAndSendOTP(phoneNumber);
      setTimer(180);
      setCanResend(false);
      setCode('');
    } catch (error) {
      console.error('Kod gönderme hatası:', error);
      Alert.alert('Hata', 'Kod gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code.length === 6) {
      handleVerifyOTP();
    }
  }, [code]);

  const handleVerifyOTP = async () => {
    if (!code || code.length !== 6) {
      return;
    }

    setLoading(true);
    try {
      const isValid = await verifyOTP(phoneNumber, code);

      if (!isValid) {
        Alert.alert('Hata', 'Geçersiz kod. Lütfen tekrar deneyiniz.');
        return;
      }

      // Kullanıcının kayıtlı olup olmadığını kontrol et
      const { exists, userData } = await checkUserExists(phoneNumber);

      if (exists && userData) {
        // Kullanıcı kayıtlıysa
        const formattedPhoneNumber = phoneNumber.startsWith('+90') 
          ? phoneNumber 
          : `+90${phoneNumber}`;

        try {
          // Kullanıcı bilgilerini kaydet
          await setUser({
            id: userData.id,
            name: `${userData.first_name} ${userData.last_name}`,
            email: userData.email || '',
            location: userData.location?.city || 'Konum belirtilmemiş',
            profileImage: userData.photos?.[0] || userData.profile_photo
          });

          console.log('Kullanıcı context\'e kaydedildi:', {
            id: userData.id,
            name: `${userData.first_name} ${userData.last_name}`
          });

          // Başarı mesajı göster
          Alert.alert(
            'Başarılı',
            'Doğrulama başarılı. Hoş geldiniz!',
            [
              {
                text: 'Tamam',
                onPress: () => {
                  // Root navigator'a geçiş - MainTabs'e doğrudan gidecek
                  const rootNavigation = navigation.getParent();
                  if (rootNavigation) {
                    rootNavigation.reset({
                      index: 0,
                      routes: [{ name: 'MainTabs' }],
                    });
                  } else {
                    // Eğer erişilemezse giriş ekranına dön
                    navigation.navigate('Giris');
                  }
                }
              }
            ]
          );
        } catch (error) {
          console.error('Kullanıcı bilgisi kaydetme hatası:', error);
          Alert.alert('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.');
        }
      } else {
        // Kullanıcı kayıtlı değilse kayıt sürecine yönlendir
        navigation.navigate('Kayit', { phoneNumber });
      }
    } catch (error) {
      console.error('OTP doğrulama hatası:', error);
      Alert.alert('Hata', 'Doğrulama işlemi başarısız oldu. Lütfen tekrar deneyiniz.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>6 haneli kod</Text>
          <Text style={styles.subtitle}>
            {phoneNumber} numarasına gönderilen kodu girin
          </Text>

          <View style={styles.otpContainer}>
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={setCode}
              style={styles.hiddenInput}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              caretHidden={true}
              selectTextOnFocus={false}
              contextMenuHidden={true}
              keyboardAppearance="light"
              returnKeyType="done"
            />
            {Array(6).fill(0).map((_, index) => (
              <Pressable 
                key={index} 
                onPress={focusInput}
                style={({ pressed }) => [
                  styles.otpBox,
                  index === 2 && styles.otpBoxWithDash,
                  pressed && styles.otpBoxPressed
                ]}
              >
                <Text style={styles.otpText}>
                  {code[index] || ''}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable 
            onPress={handleResendCode}
            disabled={!canResend}
            style={styles.resendButton}
          >
            <Text style={[
              styles.resendText,
              canResend && styles.resendTextActive
            ]}>
              {canResend 
                ? 'Kodu tekrar gönder'
                : `Kodu tekrar gönder ${formatTime(timer)}`
              }
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 32,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    position: 'relative',
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  otpBox: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxWithDash: {
    marginRight: 24,
  },
  otpBoxPressed: {
    backgroundColor: '#EBEBEB',
  },
  otpText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  resendButton: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  resendTextActive: {
    color: '#0066ff',
  },
}); 