# Kullanıcı Engelleme Sistemi - SQL Kodları

Bu klasör, uygulamanın kullanıcı engelleme işlevselliği için gereken SQL kodlarını içermektedir. Bu SQL dosyaları, veritabanında kullanıcı engellemelerinin yönetilmesi, engelleme durumlarının kontrol edilmesi ve gerekli kullanıcı arayüzü etkileşimlerinin sağlanması için gereken veritabanı yapılarını oluşturur.

## Dosyalar

1. **create_user_blocks_table.sql**: Kullanıcı engellemeleri için ana tabloyu ve ilgili kısıtlamaları, indeksleri ve tetikleyicileri oluşturur.
2. **modify_existing_queries.sql**: Mevcut sorguları engelleme durumunu kontrol edecek şekilde günceller. Kullanıcı eşleşmelerinde ve mesajlaşma sisteminde kullanılır.
3. **update_frontend_queries.sql**: Frontend tarafından kullanılan API sorgularını engelleme durumunu kontrol edecek şekilde günceller.

## Kurulum

Aşağıdaki adımları izleyerek engelleme sistemini veritabanınıza kurabilirsiniz:

### 1. PostgreSQL Veritabanına Bağlanın

```bash
psql -U [kullanıcı_adı] -d [veritabanı_adı]
```

veya Supabase kullanıyorsanız, SQL Editor'ü açın.

### 2. create_user_blocks_table.sql Dosyasını Çalıştırın

Bu dosya ana tabloyu ve ilişkili nesneleri oluşturur:

```sql
\i create_user_blocks_table.sql
```

veya dosya içeriğini kopyalayıp SQL editörüne yapıştırın ve çalıştırın.

### 3. modify_existing_queries.sql Dosyasını Çalıştırın

Bu dosya mevcut sorguları günceller:

```sql
\i modify_existing_queries.sql
```

### 4. update_frontend_queries.sql Dosyasını Çalıştırın

Bu dosya frontend tarafından kullanılan API sorgularını günceller:

```sql
\i update_frontend_queries.sql
```

## Doğrulama

Kurulumun doğru yapıldığını doğrulamak için aşağıdaki sorguları çalıştırabilirsiniz:

```sql
-- Tablo yapısını kontrol edin
\d user_blocks

-- Fonksiyonları listeleyin
\df is_user_blocked
\df check_block_status
\df get_filtered_users
\df get_chat_messages
```

## Kullanım Örnekleri

### Kullanıcı Engelleme Durumunu Kontrol Etme

```sql
SELECT * FROM check_block_status('kullanici_id_1', 'kullanici_id_2');
```

### Engellenmeyen Kullanıcıları Listeleme

```sql
SELECT * FROM get_filtered_users('mevcut_kullanici_id');
```

### Sohbet Mesajlarını Getirme (Engelleme Kontrolü İle)

```sql
SELECT * FROM get_chat_messages('mevcut_kullanici_id', 'diger_kullanici_id');
```

## Not

Bu SQL dosyaları, PostgreSQL veritabanı ile uyumlu olarak yazılmıştır ve Supabase ile kullanım için optimize edilmiştir. Farklı bir veritabanı sistemi kullanıyorsanız, bazı syntax ayarlamaları gerekebilir. 