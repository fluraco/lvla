# Günlük Mesaj Kredisi Otomasyonu

Bu otomasyon, her gün saat 09:00'da tüm kullanıcıların mesaj kredilerini kontrol eder ve kredisi 0 olan kullanıcılara 5 mesaj kredisi tanımlar. Bu şekilde, kullanıcıların mesaj göndermek için her gün yeni kredilere sahip olması sağlanır.

## Otomasyon Açıklaması

- Sadece kredisi 0 olan kullanıcılara 5 mesaj kredisi tanımlanır
- Kredisi 0'dan farklı olan kullanıcılar bu otomasyondan etkilenmez
- Yeni kayıt olan kullanıcılar için kullanıcı mesaj kredisi kaydı oluşturulur
- Her kredi işlemi için `credit_transactions` tablosuna kayıt eklenir
- Tüm otomasyon çalıştırmaları `credit_automation_logs` tablosunda izlenir

## Kurulum Adımları

1. Supabase projenize giriş yapın
2. SQL editörünü açın
3. `daily_message_credit.sql` dosyasının içeriğini SQL editörüne kopyalayın
4. SQL sorgusunu çalıştırın

## Otomasyonun Çalışma Şekli

1. Her gün saat 09:00'da `daily_message_credit_reset()` fonksiyonu otomatik olarak çalışır
2. İki temel işlem yapılır:
   - Hiç kredi kaydı olmayan kullanıcılar için yeni kayıt oluşturulur (5 kredi)
   - Kredisi 0 olan kullanıcıların kredisi 5'e yükseltilir
3. Etkilenen her kullanıcı için `credit_transactions` tablosuna işlem kaydı eklenir
4. Otomasyon çalışması ile ilgili log kaydı `credit_automation_logs` tablosuna eklenir

## Manuel Test

Otomasyonu test etmek için aşağıdaki komutu Supabase SQL editöründe çalıştırabilirsiniz:

```sql
SELECT run_daily_message_credit_reset();
```

Bu fonksiyon, etkilenen kullanıcı sayısını geri döndürür ve detaylı bir log kaydı oluşturur.

## Otomasyonu Durdurma veya Değiştirme

Zamanlanmış görevi değiştirmek veya silmek için aşağıdaki komutları kullanabilirsiniz:

```sql
-- Görevi silmek için
SELECT cron.unschedule('daily-message-credit-reset');

-- Çalışma zamanını değiştirmek için (örnek: saat 10:00'a ayarlama)
SELECT cron.schedule(
  'daily-message-credit-reset',
  '0 10 * * *',
  $$SELECT daily_message_credit_reset()$$
);
```

## Log Kayıtları

Otomasyon çalışma kayıtlarını görmek için:

```sql
SELECT * FROM credit_automation_logs ORDER BY execution_time DESC;
```

## Tablolar ve Fonksiyonlar

Bu otomasyon için aşağıdaki tablolar ve fonksiyonlar oluşturulur:

- `credit_automation_logs`: Otomasyon çalışma kayıtları
- `daily_message_credit_reset()`: Ana otomasyon fonksiyonu
- `run_daily_message_credit_reset()`: Manuel test için fonksiyon

## Uyarılar

- `pg_cron` uzantısının Supabase projenizde etkinleştirilmiş olması gerekir
- Supabase platformu zaman dilimi olarak UTC kullanır, zamanlamaları buna göre ayarlayın
- Otomasyon, `user_message_credits` ve `credit_transactions` tablolarınızın mevcut yapısına göre tasarlanmıştır 