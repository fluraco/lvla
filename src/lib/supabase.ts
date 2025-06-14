import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Supabase credentials
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.SUPABASE_ANON_KEY;

// Check if the supabase credentials are available
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL ve Anon Key eksik. Lütfen .env dosyasını kontrol edin.');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl as string, supabaseAnonKey as string); 