# Lovla Uygulaması İkon Güncelleme Talimatları

## Gerekli Adımlar:

### 1. Ana İkon Dosyası (icon.png)
- Verilen Lovla logosunu 1024x1024 boyutunda `assets/icon.png` olarak kaydedin
- Bu dosya iOS App Store ve temel uygulama ikonu için kullanılır

### 2. Adaptive İkon (adaptive-icon.png)
- Aynı logoyu 1024x1024 boyutunda `assets/adaptive-icon.png` olarak kaydedin
- Android'de adaptive ikon sistemi için kullanılır

### 3. Splash İkon (splash-icon.png)
- Logoyu 1024x1024 boyutunda `assets/splash-icon.png` olarak kaydedin
- Uygulama açılış ekranında kullanılır

### 4. Notification İkon
- Notification için daha basit bir versiyonu gerekebilir
- Şu anki SVG formatını koruyabiliriz veya PNG'ye çevirebiliriz

### 5. Favicon
- Web versiyonu için `assets/favicon.png` dosyasını güncelleyin (32x32 veya 16x16)

## Expo ile Otomatik İkon Oluşturma:

Ana ikon dosyalarını yerleştirdikten sonra:

```bash
npx expo prebuild --clean
```

Bu komut otomatik olarak tüm platform-spesifik ikon dosyalarını oluşturur.

## Manuel Platform-Spesifik Güncelleme:

Eğer manuel olarak güncellemek isterseniz:

### iOS:
- `ios/LovlaFlrtveArkadalk/Images.xcassets/AppIcon.appiconset/` klasöründeki dosyaları güncelleme

### Android:
- `android/app/src/main/res/mipmap-*` klasörlerindeki `ic_launcher.webp` dosyalarını güncelleme 