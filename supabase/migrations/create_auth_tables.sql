-- Kullanıcılar tablosu
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    auth_id UUID REFERENCES auth.users(id),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    interested_in VARCHAR(20)[] NOT NULL,
    location JSONB,
    hobbies TEXT[],
    biography TEXT,
    zodiac VARCHAR(20),
    birth_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Kullanıcı fotoğrafları tablosu
CREATE TABLE IF NOT EXISTS public.user_photos (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    is_profile BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, order_index)
);

-- OTP denemeleri tablosu
CREATE TABLE IF NOT EXISTS public.otp_attempts (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    phone_number VARCHAR(15) NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT false
);

-- RLS (Row Level Security) politikaları
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_photos ENABLE ROW LEVEL SECURITY;

-- Users tablosu için politikalar
CREATE POLICY "Users are viewable by authenticated users" 
    ON public.users FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Users can update their own record" 
    ON public.users FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = auth_id);

CREATE POLICY "Users can be created by anyone" 
    ON public.users FOR INSERT 
    TO anon 
    WITH CHECK (true);

-- User photos tablosu için politikalar
CREATE POLICY "Photos are viewable by authenticated users" 
    ON public.user_photos FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Users can manage their own photos" 
    ON public.user_photos 
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()))
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- OTP attempts tablosu için politikalar
CREATE POLICY "OTP attempts are insertable by anyone" 
    ON public.otp_attempts FOR INSERT 
    TO anon 
    WITH CHECK (true);

CREATE POLICY "OTP attempts are viewable by anyone" 
    ON public.otp_attempts FOR SELECT 
    TO anon 
    USING (true);

CREATE POLICY "OTP attempts are updatable by anyone" 
    ON public.otp_attempts FOR UPDATE 
    TO anon 
    USING (true);

-- Indexes
CREATE INDEX idx_users_phone_number ON public.users(phone_number);
CREATE INDEX idx_users_auth_id ON public.users(auth_id);
CREATE INDEX idx_otp_attempts_phone_number ON public.otp_attempts(phone_number);
CREATE INDEX idx_otp_attempts_created_at ON public.otp_attempts(created_at);
CREATE INDEX idx_user_photos_user_id ON public.user_photos(user_id);
CREATE INDEX idx_user_photos_order ON public.user_photos(user_id, order_index);

-- Triggers
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

CREATE TRIGGER set_user_photos_updated_at
    BEFORE UPDATE ON public.user_photos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at(); 