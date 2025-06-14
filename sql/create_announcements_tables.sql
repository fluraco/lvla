-- Duyurular tablosu (eğer yoksa)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  link_url TEXT,
  link_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  image_url TEXT
);

-- Duyuru görüntüleme kayıtları
CREATE TABLE IF NOT EXISTS user_announcement_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Bir kullanıcı için bir duyuruyu bir kez kaydet
  UNIQUE(user_id, announcement_id)
);

-- Push token tablosu (daha önce yoksa)
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_id TEXT,
  device_type TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Bir token bir kez kaydet
  UNIQUE(token)
);

-- Bildirim tablosu (daha önce yoksa)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  image_url TEXT,
  related_entity_id TEXT,
  related_entity_type TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Global bildirimler tablosu (daha önce yoksa)
CREATE TABLE IF NOT EXISTS global_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  image_url TEXT,
  priority INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  deep_link TEXT
);

-- Bildirim okuma kayıtları (daha önce yoksa)
CREATE TABLE IF NOT EXISTS user_notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  global_notification_id UUID NOT NULL REFERENCES global_notifications(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT TRUE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Bir kullanıcı için bir bildirim bir kez kaydet
  UNIQUE(user_id, global_notification_id)
);

-- Bildirim ayarları tablosu (daha önce yoksa)
CREATE TABLE IF NOT EXISTS user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  match_notifications BOOLEAN DEFAULT TRUE,
  message_notifications BOOLEAN DEFAULT TRUE,
  like_notifications BOOLEAN DEFAULT TRUE,
  system_notifications BOOLEAN DEFAULT TRUE,
  sound_enabled BOOLEAN DEFAULT TRUE,
  vibration_enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Bir kullanıcı için bir ayar kaydı
  UNIQUE(user_id)
);

-- RLS politikaları
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_announcement_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Duyurular için politika - sadece admin erişimi
CREATE POLICY announcements_admin_policy ON announcements
  FOR ALL USING (auth.uid() IN (SELECT id FROM admins WHERE active = TRUE));

-- Duyuru görüntüleme kayıtları - kullanıcı kendi kayıtlarını görebilir
CREATE POLICY user_announcement_views_user_policy ON user_announcement_views
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_announcement_views_insert_policy ON user_announcement_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Push token politikaları
CREATE POLICY push_tokens_user_policy ON push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY push_tokens_insert_policy ON push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bildirim politikaları
CREATE POLICY notifications_user_policy ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Global bildirimler - tüm kullanıcılar okuyabilir
CREATE POLICY global_notifications_select_policy ON global_notifications
  FOR SELECT USING (active = TRUE);

-- Bildirim okuma kayıtları
CREATE POLICY user_notification_reads_user_policy ON user_notification_reads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_notification_reads_insert_policy ON user_notification_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bildirim ayarları
CREATE POLICY user_notification_settings_user_policy ON user_notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_notification_settings_insert_policy ON user_notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_notification_settings_update_policy ON user_notification_settings
  FOR UPDATE USING (auth.uid() = user_id); 