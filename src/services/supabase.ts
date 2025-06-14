import { AppState } from 'react-native'
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env'

const supabaseUrl = SUPABASE_URL
const supabaseAnonKey = SUPABASE_ANON_KEY

// Eksik çevre değişkenleri kontrolü
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('SUPABASE_URL veya SUPABASE_ANON_KEY eksik. Lütfen .env dosyasını kontrol edin.');
}

// Normal client for user operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public'
  },
  // Completely disable realtime
  realtime: {
    params: {
      eventsPerSecond: 0
    }
  },
  global: {
    headers: {
      'x-platform': 'react-native'
    }
  }
})

// Supabase bağlantısını kontrol etmek için ping fonksiyonu
// NOT: Bu fonksiyonu kullanabilmek için Supabase'de aşağıdaki SQL fonksiyonunu oluşturmalısınız:
/*
create or replace function ping() returns text as $$
  select 'pong'::text;
$$ language sql;
*/
export async function checkSupabaseConnection() {
  try {
    // Timeout ekleyerek bağlantı kontrolü
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Bağlantı zaman aşımına uğradı')), 5000);
    });
    
    const pingPromise = supabase.rpc('ping');
    
    const { data, error } = await Promise.race([pingPromise, timeoutPromise]) as any;
    
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Supabase bağlantı kontrolü başarısız:', error);
    
    // Daha açıklayıcı hata mesajları
    let errorMessage = 'Supabase bağlantı hatası';
    
    if (error.message?.includes('timeout') || error.message?.includes('zaman aşımı')) {
      errorMessage = 'Supabase bağlantı zaman aşımı';
    } else if (error.message?.includes('network') || error.code === 'ECONNABORTED') {
      errorMessage = 'Ağ bağlantı hatası';
    } else if (error.message?.includes('not found') || error.statusCode === 404) {
      errorMessage = 'API uç noktası bulunamadı';
    } else if (error.statusCode === 401 || error.statusCode === 403) {
      errorMessage = 'Yetkilendirme hatası';
    }
    
    return { success: false, error: errorMessage };
  }
}

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
}) 