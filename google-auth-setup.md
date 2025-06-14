# Google Auth Yapılandırma Rehberi

## Google Cloud Console Yapılandırmaları

### 1. Yetkilendirme URI'ları Kontrolü
Google Cloud Console'da OAuth yapılandırmanızda aşağıdaki Yetkilendirme URI'larını eklediğinizden emin olun:

**Android için:**
```
https://auth.expo.io/@halilp/lovlalive
```

### 2. Yönlendirme URI'ları Kontrolü
Google Cloud Console'da Yönlendirme URI'larına aşağıdaki URI'ları eklediğinizden emin olun:

**Android için:**
```
com.lovlalive.app:/oauth2redirect/google-auth
```

**iOS için:**
```
com.lovlalive.app:/oauth2redirect
```

**Web için:**
```
https://auth.expo.io/@halilp/lovlalive
```

### 3. JavaScript Kaynaklarını Kontrol Et
Google Cloud Console'daki **Authorized JavaScript origins** kısmında aşağıdaki URI'ları ekleyin:

```
https://auth.expo.io
```

## Google Developers Console Adımları

1. [Google Cloud Console](https://console.cloud.google.com/) adresine gidin
2. Lovla projesini seçin
3. Sol taraftaki menüden "APIs & Services" > "Credentials" seçin
4. "OAuth 2.0 Client IDs" bölümünde "Web client" ID'yi seçin
5. "Authorized redirect URIs" bölümünde yukarıdaki URI'ları ekleyin/kontrol edin
6. "Authorized JavaScript origins" bölümünde belirtilen URI'yı ekleyin
7. Değişiklikleri kaydedin

## Android Keystore SHA-1 Parmak İzi Ekleme

Google giriş için Android keystore SHA-1 sertifikasını eklemeniz gerekebilir:

**Debug Keystore SHA-1:**
```
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

**Production Keystore SHA-1:**
```
B5:E2:66:F4:96:23:10:67:FA:A7:4A:2D:08:BD:B4:C8:09:B3:EC:CD
```

## Son Kontroller

1. **Credentials.xml:** Android projesinde `google-services.json` dosyasının güncel olduğundan emin olun
2. **App Linking:** Google Developer Console'da web client'ının doğru URL yönlendirmelerine sahip olduğundan emin olun
3. **Uygulama Yeniden Derle:** Tüm değişikliklerden sonra uygulamanızı tamamen yeniden derleyin:

```bash
# Android için
npx expo run:android

# iOS için
npx expo run:ios
```

Bu adımlar tamamlandığında Google giriş işlemi ve tarayıcıdan uygulamaya yönlendirme düzgün çalışacaktır. 