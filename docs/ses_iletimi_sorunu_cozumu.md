# Ses İletimi RLS Hatası Çözüm Kılavuzu

## Hata
```
ERROR  Ses kaydı gönderilirken hata: {"error": "Unauthorized", "message": "new row violates row-level security policy", "statusCode": "403"}
```

## Sorun
Bu hata, Supabase'deki Row Level Security (RLS) politikalarının, ses kaydını veritabanına yüklemeye çalışırken kullanıcıyı yetkilendirmediğini gösteriyor. ChatDetailScreen içindeki `stopRecording` fonksiyonu, ses kaydını "audiomessages" adlı bir Supabase Storage bucket'ına yüklemeye çalışıyor, ancak bu bucket için doğru RLS politikaları tanımlanmamış.

## Çözüm

Hatayı çözmek için Supabase'de 'audiomessages' bucket'ı için RLS politikalarını düzenlememiz gerekiyor.

### 1. Adım: Hazırladığımız SQL Kodunu Çalıştırma

`add_audio_bucket_policy.sql` dosyasında hazırladığımız SQL kodunu Supabase'in SQL editöründe çalıştırın:

1. [Supabase Dashboard](https://app.supabase.com)'a giriş yapın
2. Projenizi seçin
3. Sol menüde "SQL Editor" bölümüne gidin
4. "New Query" butonuna tıklayın
5. Oluşturduğumuz `add_audio_bucket_policy.sql` dosyasındaki SQL kodunu yapıştırın
6. "Run" butonuna tıklayarak kodu çalıştırın

### 2. Adım: Bucket'ın Oluşturulduğunu Kontrol Etme

1. Supabase Dashboard'da "Storage" bölümüne gidin
2. "audiomessages" adlı bir bucket olduğunu kontrol edin
3. Eğer yoksa, manuel olarak oluşturun:
   - "New Bucket" butonuna tıklayın
   - Bucket adı olarak "audiomessages" yazın
   - "Public" seçeneğini işaretleyin
   - "Create" butonuna tıklayın

### 3. Adım: RLS Politikalarını Kontrol Etme

1. "Storage" bölümünde "audiomessages" bucket'ını seçin
2. "Policies" sekmesine tıklayın
3. Aşağıdaki politikaların olduğunu doğrulayın:
   - "Kullanıcılar ses mesajları yükleyebilir" (INSERT)
   - "Ses mesajları herkes tarafından görüntülenebilir" (SELECT)
   - "Kullanıcılar kendi ses mesajlarını güncelleyebilir" (UPDATE)
   - "Kullanıcılar kendi ses mesajlarını silebilir" (DELETE)

Eğer politikalar eksikse veya doğru çalışmıyorsa, onları manuel olarak ekleyin.

### 4. Adım: Uygulamayı Yeniden Başlatma

Politikaları ekledikten sonra uygulamayı yeniden başlatın ve ses kayıtlarını tekrar test edin.

## Hata Devam Ederse

Eğer hata devam ederse, şunları kontrol edin:

1. **Kullanıcı Kimlik Doğrulaması**: Kullanıcının Supabase'de doğru bir şekilde kimlik doğrulaması yapıp yapmadığını kontrol edin
2. **Token Süresi**: Oturum token'ınızın süresi dolmuş olabilir, kullanıcıyı yeniden giriş yapmaya yönlendirin
3. **Log Kontrolleri**: Supabase Dashboard'daki "Database" > "Logs" bölümünden daha detaylı hata mesajlarını kontrol edin
4. **Dosya Yolu**: Ses dosyası yükleme fonksiyonunda kullanıcı ID'sinin doğru formatta verildiğinden emin olun

## Ek Bilgiler

RLS politikalarının düzgün çalışabilmesi için, ilgili bucket'a dosya yüklerken kullanıcının ID'sini (`user.id` veya `auth.uid()`) dosya yolunun parçası olarak kullanmanız önemlidir. Bu, politikalarımızda şöyle tanımlanmıştır:

```sql
(storage.foldername(name))[1] = auth.uid()::text
```

Bu kısım, dosya yolunun ilk kısmının (`/user_id/filename.ext`) kullanıcının ID'sine eşit olması gerektiğini belirtir. 