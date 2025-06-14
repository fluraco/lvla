import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { supabase } from '../lib/supabase';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Auth Session'ı başlat ve daha sonra tamamla
WebBrowser.maybeCompleteAuthSession();

// Uygulama scheme'ını al
const scheme = 'com.lovlalive.app';

// Google client ID'leri
const googleClientId = {
  webClientId: '335020874119-2uv7ce27bg37ldpga4r42jobourm2ebg.apps.googleusercontent.com',
  iosClientId: '335020874119-487f02mcmo1vlashqstm72lg2uaqhe11.apps.googleusercontent.com',
  androidClientId: '335020874119-bgr70eimr3d6ovlik0fs0hbcbsigai33.apps.googleusercontent.com',
};

interface GoogleUserInfo {
  id: string;
  email: string;
  displayName?: string;
  givenName?: string; 
  familyName?: string;
  photoURL?: string;
}

export function useGoogleAuth() {
  // URL scheme'ını oluştur
  const redirectUri = Platform.select({
    ios: `${scheme}:/oauth2redirect`,
    android: `${scheme}:/oauth2redirect/google-auth`,
    web: 'https://auth.expo.io/@halilp/lovlalive'
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: googleClientId.androidClientId,
    iosClientId: googleClientId.iosClientId,
    clientId: googleClientId.webClientId,
    redirectUri: redirectUri,
    scopes: ['profile', 'email'],
    // Yönlendirme ayarlarını ekle
    selectAccount: true,
    responseType: 'id_token'
  });

  async function signInWithGoogle() {
    try {
      console.log('Google giriş başlatılıyor, redirectUri:', redirectUri);
      
      const result = await promptAsync({
        // Tarayıcı kapanmazsa mutlaka sistemin geri geldiğinden emin ol
        showInRecents: true,
        createTask: false,
      });
      
      console.log('Google giriş sonucu:', result.type);
      
      if (result?.type === 'success') {
        const { authentication } = result;
        
        if (!authentication || !authentication.idToken) {
          throw new Error('Authentication token alınamadı');
        }
        
        console.log('Google token alındı, Supabase ile giriş yapılıyor');
        
        // Google access token'ı ile Supabase'de oturum açma
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: authentication.idToken,
        });

        if (error) throw error;
        
        // Supabase kullanıcı verileri
        const authData = data?.session?.user;
        
        if (!authData) {
          throw new Error('Kullanıcı kimliği alınamadı');
        }
        
        // Google API'den kullanıcı bilgilerini al
        const googleUserResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
          headers: { Authorization: `Bearer ${authentication.accessToken}` },
        });
        
        const googleUserData = await googleUserResponse.json();
        
        // Zenginleştirilmiş kullanıcı verisi oluştur
        const userData: GoogleUserInfo = {
          id: authData.id,
          email: authData.email || '',
          displayName: googleUserData.name,
          givenName: googleUserData.given_name,
          familyName: googleUserData.family_name,
          photoURL: googleUserData.picture
        };
        
        return {
          session: data.session,
          user: userData
        };
      }
      
      return null;
    } catch (error) {
      console.error('Google ile giriş hatası:', error);
      throw error;
    }
  }

  return {
    signInWithGoogle,
    isLoading: !!request,
  };
} 