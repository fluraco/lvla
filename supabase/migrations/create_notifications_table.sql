-- Bildirimler tablosu oluşturma
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL,  -- 'match', 'message', 'like', 'system', 'announcement' gibi değerler alabilir
    image_url TEXT,  -- İsteğe bağlı görsel URL'i
    user_id UUID REFERENCES public.users(id), -- İsteğe bağlı, belirli kullanıcı için
    sender_id UUID REFERENCES public.users(id), -- İsteğe bağlı, bildirimi tetikleyen kullanıcı
    related_entity_id UUID, -- İsteğe bağlı, ilgili varlık ID'si (mesaj, eşleşme vb.)
    related_entity_type VARCHAR(50), -- İsteğe bağlı, ilgili varlık tipi ('message', 'match', vb.)
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT notifications_type_check CHECK (type IN ('match', 'message', 'like', 'superlike', 'system', 'announcement'))
);

-- Toplu bildirimler tablosu (tüm kullanıcılara gönderilen bildirimler için)
CREATE TABLE IF NOT EXISTS public.global_notifications (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'announcement',
    image_url TEXT,
    active BOOLEAN DEFAULT true, -- Bildirim aktif mi, yoksa arşivlendi mi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE, -- İsteğe bağlı, bildirimin geçerlilik süresi
    priority INTEGER DEFAULT 1, -- Bildirimin önceliği (1: Normal, 2: Yüksek, 3: Acil)
    deep_link VARCHAR(255), -- İsteğe bağlı, uygulama içi yönlendirme
    CONSTRAINT global_notifications_type_check CHECK (type IN ('announcement', 'system', 'promotion'))
);

-- Kullanıcı-bildirim okuma tablosu (kullanıcıların toplu bildirimleri okuma durumunu takip etmek için)
CREATE TABLE IF NOT EXISTS public.user_notification_reads (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    global_notification_id UUID NOT NULL REFERENCES public.global_notifications(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, global_notification_id)
);

-- İndeksler
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_global_notifications_active ON public.global_notifications(active) WHERE active = true;
CREATE INDEX idx_user_notification_reads_user_id ON public.user_notification_reads(user_id);
CREATE INDEX idx_user_notification_reads_global_notification_id ON public.user_notification_reads(global_notification_id);
CREATE INDEX idx_user_notification_reads_is_read ON public.user_notification_reads(is_read) WHERE is_read = false;

-- Bildirim tipine göre indeks
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Notifications tablosu için updated_at triggeri
CREATE TRIGGER set_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.set_notification_updated_at();

-- Global notifications tablosu için updated_at triggeri
CREATE TRIGGER set_global_notifications_updated_at
    BEFORE UPDATE ON public.global_notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.set_notification_updated_at();

-- RLS (Row Level Security) politikaları
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_reads ENABLE ROW LEVEL SECURITY;

-- Notifications tablosu için politikalar
CREATE POLICY "Kullanıcılar kendi bildirimlerini görebilir"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR user_id IS NULL);

-- Global notifications tablosu için politikalar (herkes görebilir)
CREATE POLICY "Aktif global bildirimler herkes tarafından görülebilir"
    ON public.global_notifications FOR SELECT
    TO authenticated
    USING (active = true);

-- User notification reads tablosu için politikalar
CREATE POLICY "Kullanıcılar kendi bildirim okuma durumlarını görebilir"
    ON public.user_notification_reads FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Kullanıcılar kendi bildirim okuma durumlarını güncelleyebilir"
    ON public.user_notification_reads FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Kullanıcılar kendi bildirim okuma durumlarını güncelleyebilir"
    ON public.user_notification_reads FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Bildirim oluşturma fonksiyonu (özel bildirimler için)
CREATE OR REPLACE FUNCTION public.create_user_notification(
    p_user_id UUID,
    p_title VARCHAR,
    p_message TEXT,
    p_type VARCHAR,
    p_image_url TEXT DEFAULT NULL,
    p_sender_id UUID DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL,
    p_related_entity_type VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        image_url,
        sender_id,
        related_entity_id,
        related_entity_type
    ) VALUES (
        p_user_id,
        p_title,
        p_message,
        p_type,
        p_image_url,
        p_sender_id,
        p_related_entity_id,
        p_related_entity_type
    ) RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toplu bildirim oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION public.create_global_notification(
    p_title VARCHAR,
    p_message TEXT,
    p_type VARCHAR DEFAULT 'announcement',
    p_image_url TEXT DEFAULT NULL,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_priority INTEGER DEFAULT 1,
    p_deep_link VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.global_notifications (
        title,
        message,
        type,
        image_url,
        expires_at,
        priority,
        deep_link
    ) VALUES (
        p_title,
        p_message,
        p_type,
        p_image_url,
        p_expires_at,
        p_priority,
        p_deep_link
    ) RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bildirimleri listeleme fonksiyonu
CREATE OR REPLACE FUNCTION public.get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_include_read BOOLEAN DEFAULT false
) RETURNS SETOF public.notifications AS $$
BEGIN
    -- Kullanıcının kendi bildirimleri
    RETURN QUERY
    SELECT * FROM public.notifications
    WHERE user_id = p_user_id
    AND (is_read = false OR p_include_read = true)
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toplu bildirimleri listeleme fonksiyonu
CREATE OR REPLACE FUNCTION public.get_global_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    title VARCHAR,
    message TEXT,
    type VARCHAR,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN,
    priority INTEGER,
    deep_link VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gn.id,
        gn.title,
        gn.message,
        gn.type,
        gn.image_url,
        gn.created_at,
        COALESCE(unr.is_read, false) as is_read,
        gn.priority,
        gn.deep_link
    FROM
        public.global_notifications gn
    LEFT JOIN
        public.user_notification_reads unr
        ON gn.id = unr.global_notification_id AND unr.user_id = p_user_id
    WHERE
        gn.active = true
        AND (gn.expires_at IS NULL OR gn.expires_at > NOW())
    ORDER BY
        gn.priority DESC, gn.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Yetkilendirme
GRANT EXECUTE ON FUNCTION public.create_user_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_notifications TO authenticated; 