-- UUID uzantısını etkinleştir (eğer yoksa)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products tablosu oluşturma (eğer yoksa)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    product_type TEXT NOT NULL, -- 'consumable' veya 'subscription'
    android_product_id TEXT NOT NULL,
    ios_product_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE
);

-- Satın alma geçmişi tablosu oluşturma (eğer yoksa)
CREATE TABLE IF NOT EXISTS purchase_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id),
    transaction_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL, -- 'completed', 'refunded', 'failed'
    platform TEXT NOT NULL, -- 'android' veya 'ios'
    receipt_data TEXT, -- Doğrulama için kullanılabilecek makbuz verileri
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, transaction_id)
);

-- Abonelik tablosu oluşturma (eğer yoksa)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id),
    platform TEXT NOT NULL, -- 'android' veya 'ios'
    platform_subscription_id TEXT NOT NULL, -- Google Play veya App Store tarafından sağlanan abonelik ID'si
    status TEXT NOT NULL, -- 'active', 'canceled', 'expired'
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform, platform_subscription_id)
);

-- Users tablosuna eklenmesi gereken sütunlar (eğer yoksa)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'superlike_count') THEN
        ALTER TABLE users ADD COLUMN superlike_count INT DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'boost_count') THEN
        ALTER TABLE users ADD COLUMN boost_count INT DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'boost_active_until') THEN
        ALTER TABLE users ADD COLUMN boost_active_until TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'message_credit_count') THEN
        ALTER TABLE users ADD COLUMN message_credit_count INT DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'gift_credit_count') THEN
        ALTER TABLE users ADD COLUMN gift_credit_count INT DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_premium') THEN
        ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'premium_until') THEN
        ALTER TABLE users ADD COLUMN premium_until TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Mevcut products tablosunu temizle ve yeni ürünleri ekle
DELETE FROM products WHERE true;

-- Mevcut products tablosuna eklenecek tek seferlik ürünler
INSERT INTO products (name, description, price, product_type, android_product_id, ios_product_id)
VALUES 
    -- SuperLike ürünleri
    ('1 SuperLike', 'Tek kullanımlık özel beğeni gönderme hakkı', 39.99, 'consumable', 'com.lovlalive.superlike.single', 'com.lovlalive.superlike.single'),
    ('10 SuperLike', '10 adet özel beğeni gönderme paketi', 129.99, 'consumable', 'com.lovlalive.superlike.pack10', 'com.lovlalive.superlike.pack10'),
    ('20 SuperLike', '20 adet özel beğeni gönderme paketi', 189.99, 'consumable', 'com.lovlalive.superlike.pack20', 'com.lovlalive.superlike.pack20'),
    
    -- Boost ürünleri
    ('1 Saat Boost', '1 saatlik profil görünürlüğü artırma', 49.99, 'consumable', 'com.lovlalive.boost.hour1', 'com.lovlalive.boost.hour1'),
    ('3 Saat Boost', '3 saatlik profil görünürlüğü artırma paketi', 99.99, 'consumable', 'com.lovlalive.boost.hour3', 'com.lovlalive.boost.hour3'),
    
    -- Mesaj Kredisi ürünleri
    ('10 Mesaj Kredisi', '10 adet mesajlaşma kredisi', 59.99, 'consumable', 'com.lovlalive.msgcredits.10', 'com.lovlalive.msgcredits.10'),
    ('50 Mesaj Kredisi', '50 adet mesajlaşma kredisi', 259.99, 'consumable', 'com.lovlalive.msgcredits.50', 'com.lovlalive.msgcredits.50'),
    ('100 Mesaj Kredisi', '100 adet mesajlaşma kredisi', 399.99, 'consumable', 'com.lovlalive.msgcredits.100', 'com.lovlalive.msgcredits.100'),
    
    -- Hediye Kredisi ürünleri
    ('250 Hediye Kredisi', '250 adet hediye gönderme kredisi', 199.99, 'consumable', 'com.lovlalive.giftcredits.250', 'com.lovlalive.giftcredits.250'),
    ('500 Hediye Kredisi', '500 adet hediye gönderme kredisi', 279.99, 'consumable', 'com.lovlalive.giftcredits.500', 'com.lovlalive.giftcredits.500'),
    ('1000 Hediye Kredisi', '1000 adet hediye gönderme kredisi', 499.90, 'consumable', 'com.lovlalive.giftcredits.1000', 'com.lovlalive.giftcredits.1000'),
    
    -- Premium üyelik ürünleri
    ('Premium Aylık', 'Aylık premium üyelik', 129.99, 'subscription', 'com.lovlalive.premium.monthly', 'com.lovlalive.premium.monthly'),
    ('Premium 3 Aylık', '3 aylık premium üyelik', 349.99, 'subscription', 'com.lovlalive.premium.quarterly', 'com.lovlalive.premium.quarterly'),
    ('Premium Yıllık', 'Yıllık premium üyelik', 999.99, 'subscription', 'com.lovlalive.premium.yearly', 'com.lovlalive.premium.yearly');

-- Tek seferlik satın alma işlemleri için fonksiyon
CREATE OR REPLACE FUNCTION process_consumable_purchase(
    p_user_id UUID,
    p_product_id UUID,
    p_transaction_id TEXT,
    p_platform TEXT,
    p_receipt_data TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_product RECORD;
    v_product_name TEXT;
    v_product_type TEXT;
    v_amount INT;
    v_duration INT; -- Saat cinsinden boost süresi
BEGIN
    -- Ürün bilgisini al
    SELECT * INTO v_product FROM products WHERE id = p_product_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Ürün bulunamadı');
    END IF;
    
    v_product_name := v_product.name;
    
    -- Satın alma kaydını ekle
    INSERT INTO purchase_history (
        user_id,
        product_id,
        transaction_id,
        amount,
        status,
        platform,
        receipt_data
    )
    VALUES (
        p_user_id,
        p_product_id,
        p_transaction_id,
        v_product.price,
        'completed',
        p_platform,
        p_receipt_data
    );
    
    -- SuperLike ürünleri
    IF v_product_name LIKE '%SuperLike%' THEN
        -- Miktarı belirle
        BEGIN
            v_amount := CAST(SPLIT_PART(v_product_name, ' ', 1) AS INTEGER);
        EXCEPTION WHEN OTHERS THEN
            v_amount := 1; -- Çevrilemezse 1 olarak varsay
        END;
        
        -- Kullanıcının superlike sayısını artır
        UPDATE users
        SET superlike_count = COALESCE(superlike_count, 0) + v_amount
        WHERE id = p_user_id;
        
        RETURN json_build_object(
            'success', true,
            'message', v_amount || ' adet SuperLike hesabınıza eklendi',
            'product_type', 'superlike',
            'amount', v_amount
        );
    
    -- Boost ürünleri
    ELSIF v_product_name LIKE '%Boost%' THEN
        -- Boost süresini belirle (saat cinsinden)
        BEGIN
            v_duration := CAST(SPLIT_PART(v_product_name, ' ', 1) AS INTEGER);
        EXCEPTION WHEN OTHERS THEN
            v_duration := 1; -- Çevrilemezse 1 saat olarak varsay
        END;
        
        -- Eğer aktif boost varsa süreyi uzat, yoksa yeni boost ekle
        UPDATE users
        SET 
            boost_active_until = CASE 
                WHEN boost_active_until IS NULL OR boost_active_until < NOW() THEN
                    NOW() + (v_duration || ' hour')::INTERVAL
                ELSE
                    boost_active_until + (v_duration || ' hour')::INTERVAL
                END
        WHERE id = p_user_id;
        
        RETURN json_build_object(
            'success', true,
            'message', v_duration || ' saatlik Boost hesabınıza eklendi',
            'product_type', 'boost',
            'duration', v_duration,
            'active_until', (SELECT boost_active_until FROM users WHERE id = p_user_id)
        );
    
    -- Mesaj Kredisi ürünleri
    ELSIF v_product_name LIKE '%Mesaj Kredisi%' THEN
        -- Miktarı belirle
        BEGIN
            v_amount := CAST(SPLIT_PART(v_product_name, ' ', 1) AS INTEGER);
        EXCEPTION WHEN OTHERS THEN
            v_amount := 10; -- Çevrilemezse 10 olarak varsay
        END;
        
        -- Kullanıcının mesaj kredisini artır
        UPDATE users
        SET message_credit_count = COALESCE(message_credit_count, 0) + v_amount
        WHERE id = p_user_id;
        
        RETURN json_build_object(
            'success', true,
            'message', v_amount || ' adet Mesaj Kredisi hesabınıza eklendi',
            'product_type', 'message_credit',
            'amount', v_amount
        );
    
    -- Hediye Kredisi ürünleri
    ELSIF v_product_name LIKE '%Hediye Kredisi%' THEN
        -- Miktarı belirle
        BEGIN
            v_amount := CAST(SPLIT_PART(v_product_name, ' ', 1) AS INTEGER);
        EXCEPTION WHEN OTHERS THEN
            v_amount := 250; -- Çevrilemezse 250 olarak varsay
        END;
        
        -- Kullanıcının hediye kredisini artır
        UPDATE users
        SET gift_credit_count = COALESCE(gift_credit_count, 0) + v_amount
        WHERE id = p_user_id;
        
        RETURN json_build_object(
            'success', true,
            'message', v_amount || ' adet Hediye Kredisi hesabınıza eklendi',
            'product_type', 'gift_credit',
            'amount', v_amount
        );
    
    ELSE
        RETURN json_build_object('success', false, 'message', 'Bilinmeyen ürün tipi: ' || v_product_name);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Premium abonelik işlemleri için fonksiyon
CREATE OR REPLACE FUNCTION process_subscription_purchase(
    p_user_id UUID,
    p_product_id UUID,
    p_platform TEXT,
    p_platform_subscription_id TEXT,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_transaction_id TEXT,
    p_receipt_data TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_product RECORD;
    v_duration TEXT;
BEGIN
    -- Ürün bilgisini al
    SELECT * INTO v_product FROM products WHERE id = p_product_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Ürün bulunamadı');
    END IF;
    
    IF v_product.product_type != 'subscription' THEN
        RETURN json_build_object('success', false, 'message', 'Bu ürün bir abonelik değil');
    END IF;
    
    -- Satın alma kaydını ekle
    INSERT INTO purchase_history (
        user_id,
        product_id,
        transaction_id,
        amount,
        status,
        platform,
        receipt_data
    )
    VALUES (
        p_user_id,
        p_product_id,
        p_transaction_id,
        v_product.price,
        'completed',
        p_platform,
        p_receipt_data
    );
    
    -- Mevcut aktif aboneliği kontrol et
    IF EXISTS (
        SELECT 1 FROM subscriptions 
        WHERE user_id = p_user_id 
        AND platform = p_platform 
        AND status = 'active'
    ) THEN
        -- Mevcut aboneliği güncelle
        UPDATE subscriptions
        SET 
            product_id = p_product_id,
            platform_subscription_id = p_platform_subscription_id,
            start_date = p_start_date,
            end_date = p_end_date,
            updated_at = CURRENT_TIMESTAMP
        WHERE 
            user_id = p_user_id 
            AND platform = p_platform 
            AND status = 'active';
    ELSE
        -- Yeni abonelik oluştur
        INSERT INTO subscriptions (
            user_id,
            product_id,
            platform,
            platform_subscription_id,
            status,
            start_date,
            end_date
        )
        VALUES (
            p_user_id,
            p_product_id,
            p_platform,
            p_platform_subscription_id,
            'active',
            p_start_date,
            p_end_date
        );
    END IF;
    
    -- Kullanıcının premium durumunu güncelle
    UPDATE users
    SET 
        is_premium = TRUE,
        premium_until = p_end_date
    WHERE id = p_user_id;
    
    -- Abonelik süresini belirle
    IF v_product.name LIKE '%Aylık%' THEN
        v_duration := 'aylık';
    ELSIF v_product.name LIKE '%3 Aylık%' THEN
        v_duration := '3 aylık';
    ELSIF v_product.name LIKE '%Yıllık%' THEN
        v_duration := 'yıllık';
    ELSE
        v_duration := '';
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Premium ' || v_duration || ' aboneliğiniz başarıyla aktifleştirildi',
        'product_type', 'premium',
        'duration', v_duration,
        'end_date', p_end_date
    );
END;
$$ LANGUAGE plpgsql;

-- Abonelik yenileme işlemleri için fonksiyon
CREATE OR REPLACE FUNCTION process_subscription_renewal(
    p_platform TEXT,
    p_platform_subscription_id TEXT,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_transaction_id TEXT,
    p_receipt_data TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_subscription RECORD;
    v_product RECORD;
    v_duration TEXT;
BEGIN
    -- Abonelik bilgisini al
    SELECT s.*, u.id AS user_id 
    INTO v_subscription 
    FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    WHERE s.platform = p_platform 
    AND s.platform_subscription_id = p_platform_subscription_id
    AND s.status = 'active';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Aktif abonelik bulunamadı');
    END IF;
    
    -- Ürün bilgisini al
    SELECT * INTO v_product FROM products WHERE id = v_subscription.product_id;
    
    -- Satın alma kaydını ekle
    INSERT INTO purchase_history (
        user_id,
        product_id,
        transaction_id,
        amount,
        status,
        platform,
        receipt_data
    )
    VALUES (
        v_subscription.user_id,
        v_subscription.product_id,
        p_transaction_id,
        v_product.price,
        'completed',
        p_platform,
        p_receipt_data
    );
    
    -- Aboneliği güncelle
    UPDATE subscriptions
    SET 
        end_date = p_end_date,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_subscription.id;
    
    -- Kullanıcının premium durumunu güncelle
    UPDATE users
    SET premium_until = p_end_date
    WHERE id = v_subscription.user_id;
    
    -- Abonelik süresini belirle
    IF v_product.name LIKE '%Aylık%' THEN
        v_duration := 'aylık';
    ELSIF v_product.name LIKE '%3 Aylık%' THEN
        v_duration := '3 aylık';
    ELSIF v_product.name LIKE '%Yıllık%' THEN
        v_duration := 'yıllık';
    ELSE
        v_duration := '';
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Premium ' || v_duration || ' aboneliğiniz başarıyla yenilendi',
        'product_type', 'premium',
        'duration', v_duration,
        'end_date', p_end_date
    );
END;
$$ LANGUAGE plpgsql;

-- Abonelik iptal işlemleri için fonksiyon
CREATE OR REPLACE FUNCTION process_subscription_cancellation(
    p_platform TEXT,
    p_platform_subscription_id TEXT
)
RETURNS JSON AS $$
DECLARE
    v_subscription RECORD;
BEGIN
    -- Abonelik bilgisini al
    SELECT * INTO v_subscription 
    FROM subscriptions 
    WHERE platform = p_platform 
    AND platform_subscription_id = p_platform_subscription_id
    AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Aktif abonelik bulunamadı');
    END IF;
    
    -- Aboneliği güncelle
    UPDATE subscriptions
    SET 
        status = 'canceled',
        auto_renew = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_subscription.id;
    
    -- Not: Premium durumu end_date'e kadar devam eder
    
    RETURN json_build_object(
        'success', true,
        'message', 'Aboneliğiniz iptal edildi. Premium özellikleriniz ' || 
                   to_char(v_subscription.end_date, 'DD/MM/YYYY HH24:MI') || 
                   ' tarihine kadar geçerli olacaktır.',
        'end_date', v_subscription.end_date
    );
END;
$$ LANGUAGE plpgsql;

-- Premium durumunu kontrol eden fonksiyon (günlük çalıştırılabilir)
CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
BEGIN
    -- Süresi dolan abonelikleri işaretle
    UPDATE subscriptions
    SET status = 'expired'
    WHERE status = 'active' 
    AND end_date < NOW()
    AND auto_renew = FALSE;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Süresi dolan kullanıcıların premium durumunu güncelle
    UPDATE users u
    SET is_premium = FALSE
    FROM subscriptions s
    WHERE u.id = s.user_id
    AND s.status = 'expired'
    AND u.premium_until < NOW();
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Otomatik boost temizleme fonksiyonu (günlük çalıştırılabilir)
CREATE OR REPLACE FUNCTION check_expired_boosts()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
BEGIN
    UPDATE users
    SET boost_active_until = NULL
    WHERE boost_active_until < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql; 