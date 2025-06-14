# Hobi Sistemi Kurulumu

Bu belge, Lovlalive uygulamasında kullanılan hobi sisteminin kurulumu ve kullanımı hakkında bilgi sağlar.

## 1. Veritabanı Tablosu

Hobi sistemi için `hobby_categories` adında bir tablo oluşturulmuştur. Bu tablo, kullanıcıların seçebileceği tüm hobi kategorilerini içerir.

### Tablo Yapısı

```sql
CREATE TABLE IF NOT EXISTS public.hobby_categories (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Varsayılan Hobiler

Sistemde öntanımlı bir dizi hobi bulunmaktadır. Bunlar, `hobby_categories_setup.sql` dosyasında tanımlanmıştır.

## 2. Kurulum

### 2.1 Supabase SQL Editörü İle Kurulum

1. Supabase dashboard'a giriş yapın ve projenizi seçin
2. Sol menüden "SQL Editor" seçeneğine tıklayın
3. Yeni bir sorgu oluşturun ve `hobby_categories_setup.sql` içeriğini kopyalayın
4. "Run" butonuna tıklayarak SQL kodunu çalıştırın

### 2.2 Uygulama İçinden Otomatik Kurulum

Alternatif olarak, uygulamada filtreleme ekranı ilk açıldığında, hobi tablosu otomatik olarak kurulacaktır. Bu otomatik kurulum işlemi, `src/screens/main/home/HomeScreen.tsx` dosyasında `setupHobbyCategories` fonksiyonu içinde gerçekleştirilir.

## 3. Kullanım

### 3.1 Kullanıcı Kayıt Ekranında

Kullanıcılar kayıt işlemi sırasında `HobbiesStep` adımında hobi seçimi yapabilirler. Bu seçilen hobiler, `users` tablosundaki kullanıcı kaydının `hobbies` sütununda bir dizi olarak saklanır.

```json
// Örnek hobbies sütunu formatı
["Müzik", "Spor", "Kitap"]
```

### 3.2 Filtreleme Ekranında

Ana ekrandaki filtreleme modalında, kullanıcılar diğer kullanıcıları hobilerine göre filtreleyebilirler. Bu filtreleme işlemi, `users` tablosundaki `hobbies` sütunu kullanılarak gerçekleştirilir.

## 4. Yeni Hobi Eklemek

Sisteme yeni hobi kategorileri eklemek için aşağıdaki SQL kodunu kullanabilirsiniz:

```sql
INSERT INTO public.hobby_categories (name, icon) VALUES 
    ('Yeni Hobi Adı', 'icon-adı');
```

`icon` değeri, uygulamada kullanılan [MaterialCommunityIcons](https://materialdesignicons.com/) ikonlarından biri olmalıdır.

## 5. Uyarı

`hobby_categories` tablosu doğrudan uygulama tarafından oluşturulduğunda, tablo güvenlik politikaları (RLS) otomatik olarak yapılandırılır. Ancak manuel olarak SQL ile tablo oluşturulurken, uygun güvenlik politikalarının da eklenmesi önemlidir.

## 6. Sorun Giderme

### Tablo Yok Hatası

Eğer konsol çıktısında aşağıdaki hata görülürse:

```
ERROR  Hobiler alınamadı: {"code": "42P01", "details": null, "hint": null, "message": "relation \"public.hobby_categories\" does not exist"}
```

Bu, `hobby_categories` tablosunun henüz oluşturulmadığını gösterir. Tablonun otomatik olarak oluşturulmasını sağlamak için filtreleme ekranını açın veya yukarıdaki manuel kurulum adımlarını izleyin. 