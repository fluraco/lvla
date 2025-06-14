-- Products tablosunu temizle ve yeni ürünleri ekle
DELETE FROM products WHERE true;

-- Products tablosuna ürünleri ekle (products_rows.sql dosyasından)
INSERT INTO products (id, name, description, price, product_type, android_product_id, ios_product_id, created_at, updated_at, active) VALUES 
('1751b3b2-6ea0-48c7-8eb9-42b0e25cdfee', '1 Saat Boost', '1 saatlik profil görünürlüğü artırma', 49.99, 'consumable', 'com.lovlalive.boost.hour1', 'com.lovlalive.boost.hour1', '2025-05-22 00:05:34.638815+00', '2025-05-22 00:05:34.638815+00', true),
('21a74b27-0ac5-474e-a073-83967e75b9e7', '100 Mesaj Kredisi', '100 adet mesajlaşma kredisi', 399.99, 'consumable', 'com.lovlalive.msgcredits.100', 'com.lovlalive.msgcredits.100', '2025-05-22 00:05:34.638815+00', '2025-05-22 00:05:34.638815+00', true),
('3d367b24-f057-4799-ad23-0dc7c6822407', 'Premium Yıllık', 'Yıllık premium üyelik', 999.99, 'subscription', 'com.lovlalive.premium.yearly', 'com.lovlalive.premium.yearly', '2025-05-22 00:05:34.638815+00', '2025-05-22 00:05:34.638815+00', true),
('4a3eefea-4161-47dd-9f99-142d926efff6', '10 Mesaj Kredisi', '10 adet mesajlaşma kredisi', 59.99, 'consumable', 'com.lovlalive.msgcredits.10', 'com.lovlalive.msgcredits.10', '2025-05-22 00:05:34.638815+00', '2025-05-22 00:05:34.638815+00', true),
('4e467e6f-30e9-4d27-9e37-cc8c6648b477', '20 SuperLike', '20 adet özel beğeni gönderme paketi', 189.99, 'consumable', 'com.lovlalive.superlike.pack20', 'com.lovlalive.superlike.pack20', '2025-05-22 00:05:34.638815+00', '2025-05-22 00:05:34.638815+00', true),
('4f535790-cf76-4d8a-a2a2-e14df7acc154', 'Premium Aylık', 'Aylık premium üyelik', 299.90, 'subscription', 'com.lovlalive.premium.monthly', 'com.lovlalive.premium.monthly', '2025-05-22 00:05:34.638815+00', '2025-05-22 00:05:34.638815+00', true),
('5a8d5b5d-45e1-40f0-a958-66c56dd53ce7', '50 Mesaj Kredisi', '50 adet mesajlaşma kredisi', 259.99, 'consumable', 'com.lovlalive.msgcredits.50', 'com.lovlalive.msgcredits.50', '2025-05-22 00:05:34.638815+00', '2025-05-22 00:05:34.638815+00', true),
('60418c2c-ee3a-4f57-9fd7-0b6850794818', '10 SuperLike', '10 adet özel beğeni gönderme paketi', 129.99, 'consumable', 'com.lovlalive.superlike.pack10', 'com.lovlalive.superlike.pack10', '2025-05-22 00:05:34.638815+00', '2025-05-22 00:05:34.638815+00', true),
('7cf9d9ec-a34c-4cec-bb85-6160ae78c1ca', '250 Hediye Kredisi', '250 adet hediye gönderme kredisi', 199.99, 'consumable', 'com.lovlalive.giftcredits.250', 'com.lovlalive.giftcredits.250', '2025-05-22 00:05:34.638815+00', '2025-05-22 00:05:34.638815+00', true),
('8e88bea6-cc82-4d6c-bf49-60326acc9496', 'Premium 3 Aylık', '3 aylık premium üyelik', 349.99, 'subscription', 'com.lovlalive.premium.quarterly', 'com.lovlalive.premium.quarterly', '2025-05-22 00:05:34.638815+00', '2025-05-22 00:05:34.638815+00', true),
('b46a59fa-1569-4794-b306-225fd39cf97f', '3 Saat Boost', '3 saatlik profil görünürlüğü artırma paketi', 99.99, 'consumable', 'com.lovlalive.boost.hour3', 'com.lovlalive.boost.hour3', '2025-05-22 00:05:34.638815+00', '2025-05-22 00:05:34.638815+00', true),
('b49db772-1dd9-4691-8822-70d6c4eb9ce2', '1000 Hediye Kredisi', '1000 adet hediye gönderme kredisi', 499.90, 'consumable', 'com.lovlalive.giftcredits.1000', 'com.lovlalive.giftcredits.1000', '2025-05-22 00:05:34.638815+00', '2025-05-22 00:05:34.638815+00', true),
('e646d958-bd7b-4454-b6c4-306ea176de88', '500 Hediye Kredisi', '500 adet hediye gönderme kredisi', 279.99, 'consumable', 'com.lovlalive.giftcredits.500', 'com.lovlalive.giftcredits.500', '2025-05-22 00:05:34.638815+00', '2025-05-22 00:05:34.638815+00', true),
('ec0b7b35-5608-4798-8b80-964c1d4b9ab3', '1 SuperLike', 'Tek kullanımlık özel beğeni gönderme hakkı', 39.99, 'consumable', 'com.lovlalive.superlike.single', 'com.lovlalive.superlike.single', '2025-05-22 00:05:34.638815+00', '2025-05-22 00:05:34.638815+00', true);

-- Credit packages tablosunu temizle ve yeni paketleri ekle
DELETE FROM credit_packages WHERE true;

-- Credit packages tablosuna paketleri ekle (credit_packages_rows.sql dosyasından)
INSERT INTO credit_packages (id, package_name, description, price, credit_amount, credit_type, currency, is_active, created_at, updated_at) VALUES 
('14cd06a5-7671-4f91-b5db-5ab9b1b9542c', '10 Mesaj Kredisi', '10 adet mesaj kredisi alın', 59.99, 10, 'message', 'TL', true, '2025-05-21 21:53:39.328244+00', '2025-05-21 21:53:39.328244+00'),
('1ef46d3a-25d8-491c-ac1d-701a06ee743e', '500 Hediye Kredisi', '500 adet hediye kredisi alın', 279.99, 500, 'gift', 'TL', true, '2025-05-21 21:53:39.328244+00', '2025-05-21 21:53:39.328244+00'),
('92a8c14b-e981-4cba-8eba-fe1a9a912ade', '1000 Hediye Kredisi', '1000 adet hediye kredisi alın', 499.90, 1000, 'gift', 'TL', true, '2025-05-21 21:53:39.328244+00', '2025-05-21 21:53:39.328244+00'),
('c31de2a3-3d7b-480c-912b-070629b7bd6d', '250 Hediye Kredisi', '250 adet hediye kredisi alın', 199.99, 250, 'gift', 'TL', true, '2025-05-21 21:53:39.328244+00', '2025-05-21 21:53:39.328244+00'),
('cca80141-71b9-4652-8974-95a260bd8235', '50 Mesaj Kredisi', '50 adet mesaj kredisi alın', 259.99, 50, 'message', 'TL', true, '2025-05-21 21:53:39.328244+00', '2025-05-21 21:53:39.328244+00'),
('e86a7e14-7f74-4d17-bb8d-4afcaf613d18', '100 Mesaj Kredisi', '100 adet mesaj kredisi alın', 399.99, 100, 'message', 'TL', true, '2025-05-21 21:53:39.328244+00', '2025-05-21 21:53:39.328244+00'); 