# Supabase RLS (Row Level Security) Sorunlarını Çözme Kılavuzu

## Alınan Hatalar

```
ERROR  Supabase yükleme hatası: {"error": "Unauthorized", "message": "new row violates row-level security policy", "statusCode": "403"}
LOG  RLS hatası, ama URL oluşturuldu, mesaj göndermeyi deneyeceğiz.
ERROR  Resim yükleme hatası: A server with the specified hostname could not be found.
```

## Sorun 1: RLS Politika İhlali

Row Level Security (RLS) politikası, kullanıcıların yalnızca izin verilen verilere erişmesini sağlar. Bu hata, kullanıcının verileri eklemeye çalıştığında RLS politikasının bunu engellediğini gösterir.

### Çözüm:

1. Supabase Dashboard'a gidin: https://app.supabase.io
2. Projenizi seçin 
3. Table Editor > users tablosuna tıklayın
4. Sağ kenar çubuğunda "Auth Policies" veya "RLS Policies" seçeneğini bulun
5. Aşağıdaki RLS politikalarını kontrol edin/ekleyin:

**INSERT Politikası Örneği:**

```sql
CREATE POLICY "Kullanıcılar kendi profillerini oluşturabilir" 
ON public.users 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);
```

## Sorun 2: Storage Bucket İzinleri

Storage bucket'larında da RLS politikaları vardır ve kullanıcıların dosya yüklemesi için bunların doğru yapılandırılması gerekir.

### Çözüm:

1. Supabase Dashboard'a gidin
2. Storage menüsüne tıklayın
3. "user-photos" bucket'ını seçin (yoksa oluşturun)
4. "Policies" sekmesine gidin
5. Aşağıdaki politikaları ekleyin:

**Dosya Yükleme İzni:**
```sql
CREATE POLICY "Kullanıcılar kendi fotoğraflarını yükleyebilir"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-photos');
```

**Dosya Okuma İzni:**
```sql
CREATE POLICY "Herkes fotoğrafları görebilir"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'user-photos');
```

## Sorun 3: Sunucu Bağlantı Hatası

"A server with the specified hostname could not be found" hatası, Supabase sunucusuna bağlanılamadığını gösterir.

### Çözüm:

1. `.env` dosyasındaki `SUPABASE_URL` değerini kontrol edin
2. Doğru URL'yi ayarlayın (https:// öneki dahil)
3. Ağ bağlantısını kontrol edin
4. Supabase Durumu: https://status.supabase.com adresinden servis durumunu kontrol edin

## Test Etme

Düzeltmeler yapıldıktan sonra:

1. Uygulamayı yeniden başlatın
2. Test kullanıcısıyla giriş yapın
3. Profil fotoğrafı yüklemeyi deneyin

Yine hata alırsanız, konsol loglarını kontrol edin ve daha ayrıntılı hata mesajlarına bakın.

---

## Geçici Çözüm (Acil Durum İçin)

Eğer Supabase ayarlarını hemen değiştiremiyorsanız, kullanıcının deneyimini iyileştirmek için şu geçici çözüm yapılmıştır:

- RLS hatası durumunda, yerel URI'ler kullanılarak işlem devam edecek
- Kullanıcıya bazı fotoğrafların yüklenemediği hakkında bilgi verilecek
- Kullanıcı daha sonra profil ayarlarından fotoğrafları güncelleyebilecek

Bu, kullanıcının kayıt sürecini tamamlamasına izin verir, ancak fotoğrafların Supabase'e yüklenmesi gerçekleşmeyecektir. 