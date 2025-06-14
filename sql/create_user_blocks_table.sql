-- Kullanıcı Engellemeleri Tablosu
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id),
  blocked_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Bir kullanıcının, diğer bir kullanıcıyı bir kez engelleyebilmesi için kısıt
  CONSTRAINT user_blocks_unique UNIQUE (blocker_id, blocked_user_id),
  
  -- Kullanıcıların kendilerini engellemesini önlemek için kısıt
  CONSTRAINT user_cannot_block_self CHECK (blocker_id != blocked_user_id)
);

-- Hızlı sorgular için indeksler
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_user_id ON user_blocks(blocked_user_id);

-- Engelleme tarihini otomatik güncellemek için tetikleyici
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_user_blocks_timestamp
BEFORE UPDATE ON user_blocks
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Engelleme durumunu kontrol eden fonksiyon (kullanımı kolay olması için)
CREATE OR REPLACE FUNCTION is_user_blocked(user_id UUID, other_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  exists_block BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE (blocker_id = user_id AND blocked_user_id = other_user_id)
    OR (blocker_id = other_user_id AND blocked_user_id = user_id)
  ) INTO exists_block;
  
  RETURN exists_block;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) Politikaları
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi engelleme kayıtlarını görüntüleyebilir
CREATE POLICY user_blocks_select_policy ON user_blocks
  FOR SELECT
  USING (blocker_id = auth.uid() OR blocked_user_id = auth.uid());

-- Kullanıcılar sadece kendisi tarafından oluşturulan engelleme kayıtlarını ekleyebilir
CREATE POLICY user_blocks_insert_policy ON user_blocks
  FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

-- Kullanıcılar sadece kendisi tarafından oluşturulan engelleme kayıtlarını düzenleyebilir
CREATE POLICY user_blocks_update_policy ON user_blocks
  FOR UPDATE
  USING (blocker_id = auth.uid());

-- Kullanıcılar sadece kendisi tarafından oluşturulan engelleme kayıtlarını silebilir
CREATE POLICY user_blocks_delete_policy ON user_blocks
  FOR DELETE
  USING (blocker_id = auth.uid());

COMMENT ON TABLE user_blocks IS 'Kullanıcıların birbirlerini engellemesi için kullanılan tablo';
COMMENT ON COLUMN user_blocks.blocker_id IS 'Engelleme işlemini yapan kullanıcının ID''si';
COMMENT ON COLUMN user_blocks.blocked_user_id IS 'Engellenen kullanıcının ID''si'; 