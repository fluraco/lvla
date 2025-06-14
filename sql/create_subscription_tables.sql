-- Ürünler tablosu
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    product_type VARCHAR(50) NOT NULL, -- 'subscription', 'consumable', 'non_consumable'
    android_product_id VARCHAR(255), -- Google Play Store ürün ID'si
    ios_product_id VARCHAR(255), -- App Store ürün ID'si
    duration_days INTEGER, -- Abonelik süresi (gün cinsinden)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Kullanıcı abonelikleri tablosu
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    purchase_token TEXT, -- Google Play veya App Store tarafından sağlanan satın alma belirteci
    transaction_id VARCHAR(255), -- App Store transaction ID veya Google Play order ID
    purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Aboneliğin sona erme tarihi
    auto_renew BOOLEAN DEFAULT true, -- Otomatik yenileme açık mı?
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'expired', 'cancelled', 'pending'
    platform VARCHAR(20) NOT NULL, -- 'ios' veya 'android'
    receipt_data TEXT, -- Satın alma makbuzu verisi (doğrulama için)
    latest_receipt TEXT, -- Son makbuz (iOS için)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Satın alma geçmişi tablosu
CREATE TABLE IF NOT EXISTS purchase_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    subscription_id UUID REFERENCES user_subscriptions(id),
    transaction_id VARCHAR(255),
    purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'TRY',
    status VARCHAR(50) NOT NULL, -- 'completed', 'refunded', 'failed'
    platform VARCHAR(20) NOT NULL, -- 'ios' veya 'android'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Premium ürünlerini ekle
INSERT INTO products (name, description, price, product_type, android_product_id, ios_product_id, duration_days)
VALUES 
    ('Premium Aylık', 'Aylık premium abonelik', 299.90, 'subscription', 'com.lovlalive.premium.monthly', 'com.lovlalive.premium.monthly', 30);

-- RLS (Row Level Security) politikalarını ayarla
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;

-- Herkes ürünleri okuyabilir
CREATE POLICY products_select_policy ON products 
    FOR SELECT USING (true);

-- Kullanıcılar kendi aboneliklerini okuyabilir
CREATE POLICY subscriptions_select_policy ON user_subscriptions 
    FOR SELECT USING (auth.uid() = user_id);

-- Kullanıcılar kendi satın alma geçmişlerini görebilir
CREATE POLICY purchase_history_select_policy ON purchase_history 
    FOR SELECT USING (auth.uid() = user_id);

-- Abonelik durumunu güncellemek için fonksiyon
CREATE OR REPLACE FUNCTION update_user_premium_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Eğer yeni bir aktif abonelik kaydediliyorsa, kullanıcının premium durumunu güncelle
    IF NEW.status = 'active' THEN
        UPDATE users
        SET 
            is_premium = true,
            premium_expires_at = NEW.expires_at
        WHERE id = NEW.user_id;
    -- Eğer abonelik süresi dolmuş veya iptal edilmişse ve kullanıcının başka aktif aboneliği yoksa, premium durumunu kaldır
    ELSIF (NEW.status = 'expired' OR NEW.status = 'cancelled') THEN
        -- Kullanıcının başka aktif aboneliği var mı kontrol et
        IF NOT EXISTS (
            SELECT 1 FROM user_subscriptions 
            WHERE user_id = NEW.user_id 
            AND status = 'active' 
            AND id != NEW.id
        ) THEN
            UPDATE users
            SET 
                is_premium = false,
                premium_expires_at = NULL
            WHERE id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Abonelik tablosu için trigger
CREATE TRIGGER update_premium_status_trigger
AFTER INSERT OR UPDATE ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_user_premium_status();

-- Abonelik işlemleri için fonksiyon
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
    v_amount NUMERIC(10, 2);
BEGIN
    -- Ürün bilgisini al
    SELECT * INTO v_product FROM products WHERE id = p_product_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Ürün bulunamadı');
    END IF;
    
    -- Bitiş tarihini hesapla
    v_expires_at := now() + (v_product.duration_days || ' days')::INTERVAL;
    v_amount := v_product.price;
    
    -- Eğer aktif abonelik varsa güncelle, yoksa yeni abonelik ekle
    IF EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = p_user_id 
        AND product_id = p_product_id 
        AND status = 'active'
    ) THEN
        UPDATE user_subscriptions
        SET 
            transaction_id = p_transaction_id,
            purchase_token = p_purchase_token,
            expires_at = v_expires_at,
            auto_renew = true,
            status = 'active',
            platform = p_platform,
            receipt_data = p_receipt_data,
            latest_receipt = p_latest_receipt,
            updated_at = now()
        WHERE 
            user_id = p_user_id AND 
            product_id = p_product_id AND
            status = 'active'
        RETURNING id INTO v_subscription_id;
    ELSE
        INSERT INTO user_subscriptions (
            user_id, 
            product_id, 
            transaction_id, 
            purchase_token, 
            expires_at, 
            status, 
            platform, 
            receipt_data,
            latest_receipt
        )
        VALUES (
            p_user_id, 
            p_product_id, 
            p_transaction_id, 
            p_purchase_token, 
            v_expires_at, 
            'active', 
            p_platform, 
            p_receipt_data,
            p_latest_receipt
        )
        RETURNING id INTO v_subscription_id;
    END IF;
    
    -- Satın alma kaydı ekle
    INSERT INTO purchase_history (
        user_id,
        product_id,
        subscription_id,
        transaction_id,
        amount,
        status,
        platform
    )
    VALUES (
        p_user_id,
        p_product_id,
        v_subscription_id,
        p_transaction_id,
        v_amount,
        'completed',
        p_platform
    );

    -- Premium kullanıcı olarak güncellendi
    UPDATE users
    SET 
        is_premium = true,
        premium_expires_at = v_expires_at
    WHERE id = p_user_id;
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Abonelik başarıyla kaydedildi',
        'subscription_id', v_subscription_id,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql;

-- Abonelik iptal fonksiyonu
CREATE OR REPLACE FUNCTION cancel_subscription(
    p_user_id UUID,
    p_subscription_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_subscription_exists BOOLEAN;
BEGIN
    -- Aboneliğin kullanıcıya ait olup olmadığını kontrol et
    SELECT EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE id = p_subscription_id AND user_id = p_user_id
    ) INTO v_subscription_exists;
    
    IF NOT v_subscription_exists THEN
        RETURN json_build_object('success', false, 'message', 'Abonelik bulunamadı veya erişim izniniz yok');
    END IF;
    
    -- Aboneliği iptal et
    UPDATE user_subscriptions
    SET 
        status = 'cancelled',
        auto_renew = false,
        updated_at = now()
    WHERE id = p_subscription_id;
    
    -- Kullanıcının başka aktif aboneliği var mı kontrol et
    IF NOT EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = p_user_id 
        AND status = 'active'
    ) THEN
        -- Kullanıcının premium durumunu kaldır, ancak abonelik süresi bitene kadar kullanmaya devam etsin
        UPDATE users
        SET is_premium = false
        WHERE id = p_user_id;
    END IF;
    
    RETURN json_build_object('success', true, 'message', 'Abonelik başarıyla iptal edildi');
END;
$$ LANGUAGE plpgsql; 