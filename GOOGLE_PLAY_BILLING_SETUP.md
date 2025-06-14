# Google Play Billing Entegrasyonu Kurulum ve Test Rehberi

## Yapılan Değişiklikler

### 1. Veritabanı Yapısı
- **Yeni tablolar oluşturuldu:**
  - `products` - Tüm uygulama içi ürünler
  - `credit_packages` - Kredi paketleri
  - `user_subscriptions` - Kullanıcı abonelikleri
  - `purchase_history` - Satın alma geçmişi
  - `user_boosts` - Kullanıcı boost'ları
  - `user_message_credits` - Mesaj kredileri
  - `user_credits` - Hediye kredileri

- **Stored procedure'lar:**
  - `process_subscription()` - Abonelik işlemleri
  - `process_consumable_purchase()` - Tek seferlik satın almalar
  - `get_user_superlikes()` - Kullanıcı SuperLike sayısı

### 2. IAP Service Güncellemeleri
- **Dinamik ürün yükleme:** Ürün ID'leri artık veritabanından dinamik olarak yükleniyor
- **Platform desteği:** iOS ve Android için ayrı ürün ID'leri
- **Hata yönetimi:** Gelişmiş hata yakalama ve kullanıcı bildirimleri
- **Tüketim desteği:** Consumable ve non-consumable ürün ayrımı

### 3. UI Güncellemeleri
- **PremiumScreen:** Dinamik fiyat gösterimi ve ürün yükleme
- **ConsumablesShopScreen:** Kategorilere göre ürün filtreleme
- **Debug Component:** Test ve hata ayıklama için yardımcı bileşen

## Kurulum Adımları

### 1. Veritabanı Kurulumu
```bash
# Supabase migration'ları çalıştır
supabase db reset
supabase db push

# Veya SQL dosyalarını manuel olarak çalıştır:
# 1. create_products_and_billing.sql
# 2. insert_products_data.sql
```

### 2. Google Play Console Kurulumu
1. **Google Play Console'da** ürünleri oluşturun:
   - Abonelik ürünleri (Premium Aylık, 3 Aylık, Yıllık)
   - Managed products (Boost, SuperLike, Krediler)

2. **Ürün ID'leri** veritabanındakilerle aynı olmalı:
   ```
   - com.lovlalive.premium.monthly
   - com.lovlalive.premium.quarterly
   - com.lovlalive.premium.yearly
   - com.lovlalive.boost.hour1
   - com.lovlalive.boost.hour3
   - com.lovlalive.superlike.single
   - com.lovlalive.superlike.pack10
   - com.lovlalive.superlike.pack20
   - com.lovlalive.msgcredits.10
   - com.lovlalive.msgcredits.50
   - com.lovlalive.msgcredits.100
   - com.lovlalive.giftcredits.250
   - com.lovlalive.giftcredits.500
   - com.lovlalive.giftcredits.1000
   ```

### 3. Uygulama Build Ayarları
`android/app/build.gradle` dosyasında aşağıdaki satırın bulunduğundan emin olun:
```gradle
defaultConfig {
    missingDimensionStrategy "store", "play"
    // ... diğer ayarlar
}
```

## Test Etme

### 1. Debug Component Kullanımı
Test için debug component'i herhangi bir ekrana ekleyebilirsiniz:

```tsx
import { IAPDebugComponent } from '../components/debug/IAPDebugComponent';

// Render içinde:
<IAPDebugComponent />
```

### 2. Manuel Test Adımları

1. **Auth Kontrolü**
   - Kullanıcının giriş yapmış olduğundan emin olun
   - Debug component'te "Auth Test" butonuna basın

2. **Veritabanı Kontrolü**
   - "Veritabanı Test" butonuna basın
   - Ürünlerin düzgün yüklendiğini kontrol edin

3. **IAP Servisi Kontrolü**
   - "IAP Test" butonuna basın
   - Google Play'den ürünlerin yüklendiğini kontrol edin

4. **Premium Ekranı Testi**
   - Premium ekranına gidin
   - Ürün fiyatlarının göründüğünü kontrol edin
   - "Premium Ol" butonuna basın

5. **Mağaza Ekranı Testi**
   - Mağaza ekranına gidin
   - Farklı kategorilerdeki ürünleri kontrol edin
   - Satın alma butonlarına basın

### 3. Gerçek Satın Alma Testi

**DİKKAT:** Gerçek satın alma testleri yapmadan önce:

1. **Test hesapları** kullanın (Google Play Console'da tanımlanmış)
2. **Staging/Debug build** kullanın
3. **Test kartları** kullanın (gerçek para harcanmaz)

## Hata Giderme

### Yaygın Sorunlar

1. **"Ürün bulunamadı" Hatası**
   - Google Play Console'da ürünlerin aktif olduğunu kontrol edin
   - Ürün ID'lerinin doğru olduğunu kontrol edin
   - Uygulama imzasının doğru olduğunu kontrol edin

2. **"Giriş yapmanız gerekmektedir" Hatası**
   - Kullanıcı auth durumunu kontrol edin
   - Supabase auth session'ının aktif olduğunu kontrol edin

3. **Veritabanı Hataları**
   - Migration'ların düzgün çalıştığını kontrol edin
   - RLS (Row Level Security) politikalarını kontrol edin

### Debug Log'ları

Console log'larını takip edin:
```bash
# React Native Debug Console'da:
- "IAP servisi başlatıldı"
- "Veritabanından X ürün yüklendi"
- "Google Play/App Store'dan X ürün alındı"
```

## Önemli Notlar

1. **Staging vs Production**
   - Staging'de test kartları kullanın
   - Production'da gerçek ödeme işlemleri olacak

2. **Ürün ID Eşleşmesi**
   - Veritabanındaki ürün ID'leri ile Google Play Console'daki ID'ler aynı olmalı
   - Platform farkı: iOS ve Android için ayrı ID'ler

3. **Güvenlik**
   - Satın alma doğrulaması server-side yapılıyor
   - Receipt validation Supabase stored procedure'larında

4. **Performans**
   - Ürünler uygulama başlangıcında yükleniyor
   - Cache mekanizması var (singleton pattern)

## Gelecek Geliştirmeler

1. **Webhook Entegrasyonu**
   - Google Play Real-time Developer Notifications
   - Otomatik abonelik yenileme/iptal işlemleri

2. **Analytics**
   - Satın alma istatistikleri
   - Conversion rate tracking

3. **A/B Testing**
   - Farklı fiyat testleri
   - UI/UX optimizasyonları 