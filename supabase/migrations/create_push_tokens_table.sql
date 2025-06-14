-- Push token'ları saklamak için tablo oluşturma
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_id TEXT,
    device_type TEXT, -- 'ios' veya 'android'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, token)
);

-- İndeks
CREATE INDEX idx_push_tokens_user_id ON public.push_tokens(user_id);

-- Updated_at trigger
CREATE TRIGGER set_push_tokens_updated_at
    BEFORE UPDATE ON public.push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.set_notification_updated_at();

-- RLS (Row Level Security) politikaları
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Push tokens tablosu için politikalar
CREATE POLICY "Kullanıcılar kendi push token'larını görebilir"
    ON public.push_tokens FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Kullanıcılar kendi push token'larını ekleyebilir/güncelleyebilir"
    ON public.push_tokens FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Kullanıcılar kendi push token'larını güncelleyebilir"
    ON public.push_tokens FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Kullanıcılar kendi push token'larını silebilir"
    ON public.push_tokens FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Push token yönetim fonksiyonları
CREATE OR REPLACE FUNCTION public.save_push_token(
    p_user_id UUID,
    p_token TEXT,
    p_device_id TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_token_id UUID;
BEGIN
    INSERT INTO public.push_tokens (
        user_id,
        token,
        device_id,
        device_type
    ) VALUES (
        p_user_id,
        p_token,
        p_device_id,
        p_device_type
    )
    ON CONFLICT (user_id, token) 
    DO UPDATE SET
        device_id = EXCLUDED.device_id,
        device_type = EXCLUDED.device_type,
        updated_at = NOW()
    RETURNING id INTO v_token_id;

    RETURN v_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kullanıcının push token'larını getirme fonksiyonu
CREATE OR REPLACE FUNCTION public.get_user_push_tokens(
    p_user_id UUID
) RETURNS SETOF public.push_tokens AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.push_tokens
    WHERE user_id = p_user_id
    ORDER BY updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Yetkilendirme
GRANT EXECUTE ON FUNCTION public.save_push_token TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_push_tokens TO authenticated; 