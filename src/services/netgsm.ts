import { supabase } from './supabase';

interface NetGSMConfig {
  usercode: string;
  password: string;
  msgheader: string;
}

const NETGSM_CONFIG: NetGSMConfig = {
  usercode: process.env.EXPO_PUBLIC_NETGSM_USERCODE || '',
  password: process.env.EXPO_PUBLIC_NETGSM_PASSWORD || '',
  msgheader: process.env.EXPO_PUBLIC_NETGSM_MSGHEADER || '',
};

const OTP_CONFIG = {
  CODE_LENGTH: 6,
  RETRY_WAIT_MINUTES: 3,
  MAX_ATTEMPTS_IN_TIMEFRAME: 3,
  TIMEFRAME_HOURS: 3,
};

export async function generateAndSendOTP(phoneNumber: string): Promise<string> {
  try {
    // Test numarası kontrolü
    if (phoneNumber === '5440004444') {
      // Test numarası için OTP kaydı oluştur
      const testCode = '123456';
      const { error: insertError } = await supabase
        .from('otp_attempts')
        .insert({
          phone_number: phoneNumber,
          code: testCode,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 dakika geçerli
        });

      if (insertError) throw new Error('OTP kaydedilemedi');
      return testCode;
    }

    // Önceki gönderim kayıtlarını kontrol et
    const { data: otpAttempts, error: fetchError } = await supabase
      .from('otp_attempts')
      .select('created_at')
      .eq('phone_number', phoneNumber)
      .gte('created_at', new Date(Date.now() - OTP_CONFIG.TIMEFRAME_HOURS * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (fetchError) throw new Error('OTP kayıtları kontrol edilemedi');

    // Son 3 saatteki deneme sayısını kontrol et
    if (otpAttempts && otpAttempts.length >= OTP_CONFIG.MAX_ATTEMPTS_IN_TIMEFRAME) {
      throw new Error('Çok fazla deneme yaptınız. Lütfen 3 saat sonra tekrar deneyin.');
    }

    // Son denemenin üzerinden 3 dakika geçip geçmediğini kontrol et
    if (otpAttempts && otpAttempts.length > 0) {
      const lastAttempt = new Date(otpAttempts[0].created_at);
      const minutesSinceLastAttempt = (Date.now() - lastAttempt.getTime()) / (60 * 1000);
      
      if (minutesSinceLastAttempt < OTP_CONFIG.RETRY_WAIT_MINUTES) {
        throw new Error(`Lütfen ${Math.ceil(OTP_CONFIG.RETRY_WAIT_MINUTES - minutesSinceLastAttempt)} dakika sonra tekrar deneyin.`);
      }
    }

    // 6 haneli kod oluştur
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const message = `Lovla doğrulama kodunuz: ${code}`;

    // NETGSM API'ye istek at
    const response = await fetch('https://api.netgsm.com.tr/sms/send/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        usercode: NETGSM_CONFIG.usercode,
        password: NETGSM_CONFIG.password,
        gsmno: phoneNumber,
        message: message,
        msgheader: NETGSM_CONFIG.msgheader,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('SMS gönderilemedi');
    }

    // OTP kaydını oluştur
    const { error: insertError } = await supabase
      .from('otp_attempts')
      .insert({
        phone_number: phoneNumber,
        code: code,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 dakika geçerli
      });

    if (insertError) throw new Error('OTP kaydedilemedi');

    return code;
  } catch (error) {
    console.error('OTP gönderme hatası:', error);
    throw error;
  }
}

export async function verifyOTP(phoneNumber: string, code: string): Promise<boolean> {
  try {
    const { data: otpRecord, error } = await supabase
      .from('otp_attempts')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('code', code)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !otpRecord) {
      return false;
    }

    // OTP doğrulandı olarak işaretle
    await supabase
      .from('otp_attempts')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    return true;
  } catch (error) {
    console.error('OTP doğrulama hatası:', error);
    return false;
  }
} 