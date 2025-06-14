CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  admin_response TEXT,
  admin_response_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX tickets_user_id_idx ON public.tickets (user_id);
CREATE INDEX tickets_status_idx ON public.tickets (status);

-- Tickets tablosu için RLS politikaları
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi ticketlarını görebilir
CREATE POLICY "Kullanıcılar kendi ticket'larını görebilir" 
ON public.tickets FOR SELECT 
USING (auth.uid() = user_id);

-- Kullanıcılar kendi ticket'larını oluşturabilir
CREATE POLICY "Kullanıcılar ticket oluşturabilir" 
ON public.tickets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Yöneticilerin ticket'lara erişim politikası (gerçek uygulamada admin rolüne göre düzenlenmelidir)
-- CREATE POLICY "Yöneticiler tüm ticket'ları görebilir ve düzenleyebilir" 
-- ON public.tickets FOR ALL 
-- USING (auth.jwt() ->> 'role' = 'admin');

-- Trigger function to update updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating updated_at on tickets table
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION update_modified_column(); 