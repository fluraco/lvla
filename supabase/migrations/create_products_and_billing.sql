-- UUID uzantısını etkinleştir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products tablosu oluştur (eğer yoksa)
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

-- Credit packages tablosu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS credit_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    credit_amount INTEGER NOT NULL,
    credit_type TEXT NOT NULL, -- 'message' veya 'gift'
    currency TEXT DEFAULT 'TL',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions tablosu
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    product_id UUID REFERENCES products(id),
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'cancelled'
    platform TEXT NOT NULL, -- 'android' veya 'ios'
    transaction_id TEXT,
    purchase_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Purchase history tablosu
CREATE TABLE IF NOT EXISTS purchase_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    product_id UUID REFERENCES products(id),
    transaction_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'refunded', 'failed'
    platform TEXT NOT NULL, -- 'android' veya 'ios'
    receipt_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User boosts tablosu
CREATE TABLE IF NOT EXISTS user_boosts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    boost_hours INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT FALSE,
    is_used BOOLEAN DEFAULT FALSE,
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User message credits tablosu
CREATE TABLE IF NOT EXISTS user_message_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    credit_amount INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User credits tablosu (hediye kredileri için)
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    credit_amount INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users tablosuna premium alanları ekle (eğer yoksa)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_premium') THEN
        ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'premium_expires_at') THEN
        ALTER TABLE users ADD COLUMN premium_expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'superlike_count') THEN
        ALTER TABLE users ADD COLUMN superlike_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Abonelik işleme fonksiyonu
CREATE OR REPLACE FUNCTION process_subscription(
    p_user_id UUID,
    p_product_id UUID,
    p_transaction_id TEXT,
    p_purchase_token TEXT,
    p_platform TEXT,
    p_receipt_data TEXT DEFAULT NULL,
    p_latest_receipt TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_product RECORD;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_subscription_id UUID;
BEGIN
    -- Ürün bilgisini al
    SELECT * INTO v_product FROM products WHERE id = p_product_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Ürün bulunamadı');
    END IF;
    
    -- Premium abonelik için 30 gün ekle
    v_expires_at := NOW() + INTERVAL '30 days';
    
    -- Mevcut aboneliği kontrol et ve güncelle/ekle
    INSERT INTO user_subscriptions (
        user_id, 
        product_id, 
        transaction_id, 
        purchase_token, 
        expires_at, 
        status, 
        platform
    )
    VALUES (
        p_user_id, 
        p_product_id, 
        p_transaction_id, 
        p_purchase_token, 
        v_expires_at, 
        'active', 
        p_platform
    )
    ON CONFLICT (user_id, product_id) 
    DO UPDATE SET
        transaction_id = EXCLUDED.transaction_id,
        purchase_token = EXCLUDED.purchase_token,
        expires_at = EXCLUDED.expires_at,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_subscription_id;
    
    -- Purchase history ekle
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

    -- Kullanıcının premium durumunu güncelle
    UPDATE users
    SET 
        is_premium = TRUE,
        premium_expires_at = v_expires_at
    WHERE id = p_user_id;
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Premium aboneliğiniz başarıyla aktifleştirildi',
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql;

-- Consumable satın alma işleme fonksiyonu
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
    v_amount INTEGER;
    v_boost_hours INTEGER;
BEGIN
    -- Ürün bilgisini al
    SELECT * INTO v_product FROM products WHERE id = p_product_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Ürün bulunamadı');
    END IF;
    
    -- Purchase history ekle
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
    
    -- Ürün tipine göre işlem yap
    IF v_product.name ILIKE '%SuperLike%' THEN
        -- SuperLike sayısını çıkar
        v_amount := CAST(REGEXP_REPLACE(v_product.name, '[^0-9]', '', 'g') AS INTEGER);
        
        -- Kullanıcının superlike sayısını artır
        UPDATE users
        SET superlike_count = COALESCE(superlike_count, 0) + v_amount
        WHERE id = p_user_id;
        
        RETURN json_build_object(
            'success', true,
            'message', v_amount || ' adet SuperLike hesabınıza eklendi'
        );
        
    ELSIF v_product.name ILIKE '%Boost%' THEN
        -- Boost saatini çıkar
        v_boost_hours := CAST(REGEXP_REPLACE(v_product.name, '[^0-9]', '', 'g') AS INTEGER);
        
        -- User boosts tablosuna ekle
        INSERT INTO user_boosts (user_id, boost_hours, is_active, is_used)
        VALUES (p_user_id, v_boost_hours, FALSE, FALSE);
        
        RETURN json_build_object(
            'success', true,
            'message', v_boost_hours || ' saatlik Boost hesabınıza eklendi'
        );
        
    ELSIF v_product.name ILIKE '%Mesaj Kredisi%' THEN
        -- Mesaj kredisi sayısını çıkar
        v_amount := CAST(REGEXP_REPLACE(v_product.name, '[^0-9]', '', 'g') AS INTEGER);
        
        -- User message credits güncelle
        INSERT INTO user_message_credits (user_id, credit_amount)
        VALUES (p_user_id, v_amount)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            credit_amount = user_message_credits.credit_amount + EXCLUDED.credit_amount,
            updated_at = CURRENT_TIMESTAMP;
        
        RETURN json_build_object(
            'success', true,
            'message', v_amount || ' adet Mesaj Kredisi hesabınıza eklendi'
        );
        
    ELSIF v_product.name ILIKE '%Hediye Kredisi%' THEN
        -- Hediye kredisi sayısını çıkar
        v_amount := CAST(REGEXP_REPLACE(v_product.name, '[^0-9]', '', 'g') AS INTEGER);
        
        -- User credits güncelle
        INSERT INTO user_credits (user_id, credit_amount)
        VALUES (p_user_id, v_amount)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            credit_amount = user_credits.credit_amount + EXCLUDED.credit_amount,
            updated_at = CURRENT_TIMESTAMP;
        
        RETURN json_build_object(
            'success', true,
            'message', v_amount || ' adet Hediye Kredisi hesabınıza eklendi'
        );
    ELSE
        RETURN json_build_object('success', false, 'message', 'Bilinmeyen ürün tipi');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- User SuperLike sayısını getiren fonksiyon
CREATE OR REPLACE FUNCTION get_user_superlikes(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COALESCE(superlike_count, 0) FROM users WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Unique constraint'ler ekle
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_subscriptions_user_product_key'
    ) THEN
        ALTER TABLE user_subscriptions 
        ADD CONSTRAINT user_subscriptions_user_product_key 
        UNIQUE (user_id, product_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_message_credits_user_id_key'
    ) THEN
        ALTER TABLE user_message_credits 
        ADD CONSTRAINT user_message_credits_user_id_key 
        UNIQUE (user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_credits_user_id_key'
    ) THEN
        ALTER TABLE user_credits 
        ADD CONSTRAINT user_credits_user_id_key 
        UNIQUE (user_id);
    END IF;
END $$; 