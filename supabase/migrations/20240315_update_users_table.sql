-- Mevcut users tablosunu düşürelim
DROP TABLE IF EXISTS users;

-- Yeni users tablosunu oluşturalım
CREATE TABLE public.users (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    auth_id UUID REFERENCES auth.users(id),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    gender VARCHAR(20),
    interested_in TEXT[], -- ['male', 'female', 'both'] değerlerini alabilir
    location JSONB, -- { latitude: number, longitude: number, city: string, country: string }
    hobbies TEXT[],
    biography TEXT,
    birth_date TIMESTAMP WITH TIME ZONE,
    photos TEXT[], -- Fotoğraf URL'lerinin dizisi
    profile_photo TEXT, -- Ana profil fotoğrafının URL'i
    looking_for TEXT[], -- Aradığı özelliklerin dizisi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT users_phone_number_check CHECK (phone_number ~ '^\+?[0-9]{10,15}$'),
    CONSTRAINT users_gender_check CHECK (gender IN ('male', 'female')),
    CONSTRAINT users_birth_date_check CHECK (
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date::date)) >= 18
    )
);

-- İndexler
CREATE INDEX idx_users_phone_number ON public.users(phone_number);
CREATE INDEX idx_users_auth_id ON public.users(auth_id);
CREATE INDEX idx_users_gender ON public.users(gender);
CREATE INDEX idx_users_birth_date ON public.users(birth_date);
CREATE INDEX idx_users_location ON public.users USING GIN (location);
CREATE INDEX idx_users_interested_in ON public.users USING GIN (interested_in);
CREATE INDEX idx_users_hobbies ON public.users USING GIN (hobbies);
CREATE INDEX idx_users_looking_for ON public.users USING GIN (looking_for);

-- Updated_at trigger'ı
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- RLS (Row Level Security) politikaları
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Tüm işlemlere izin ver (geçici olarak)
CREATE POLICY "Temporary full access"
    ON public.users
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Storage bucket'ı oluştur (eğer yoksa)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-photos', 'user-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage için RLS politikalarını güncelle
DROP POLICY IF EXISTS "Public access" ON storage.objects;
CREATE POLICY "Public access"
    ON storage.objects
    FOR ALL
    TO public
    USING (bucket_id = 'user-photos')
    WITH CHECK (bucket_id = 'user-photos'); 