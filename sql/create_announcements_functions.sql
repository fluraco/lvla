-- Duyurular için fonksiyonlar

-- Görüntülenmemiş duyuruları getiren fonksiyon
CREATE OR REPLACE FUNCTION get_unviewed_announcements(p_user_id UUID)
RETURNS SETOF announcements AS $$
BEGIN
  RETURN QUERY
  SELECT a.*
  FROM announcements a
  WHERE a.is_active = TRUE
    AND a.start_date <= NOW()
    AND (a.end_date IS NULL OR a.end_date >= NOW())
    AND NOT EXISTS (
      SELECT 1
      FROM user_announcement_views v
      WHERE v.announcement_id = a.id
        AND v.user_id = p_user_id
    )
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kullanıcı için push tokenları getiren fonksiyon
CREATE OR REPLACE FUNCTION get_user_push_tokens(p_user_id UUID)
RETURNS TABLE (
  token TEXT,
  device_id TEXT,
  device_type TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT pt.token, pt.device_id, pt.device_type, pt.created_at
  FROM push_tokens pt
  WHERE pt.user_id = p_user_id
    AND pt.active = TRUE
  ORDER BY pt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Push token kaydetme fonksiyonu
CREATE OR REPLACE FUNCTION save_push_token(
  p_user_id UUID,
  p_token TEXT,
  p_device_id TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  -- Aynı cihaz ve kullanıcı için var olan token kontrolü
  SELECT id INTO v_existing_id
  FROM push_tokens
  WHERE user_id = p_user_id
    AND (
      (p_device_id IS NOT NULL AND device_id = p_device_id) OR
      token = p_token
    )
  LIMIT 1;
  
  -- Varsa güncelle
  IF v_existing_id IS NOT NULL THEN
    UPDATE push_tokens
    SET token = p_token,
        active = TRUE,
        updated_at = NOW()
    WHERE id = v_existing_id;
  ELSE
    -- Yoksa yeni kayıt oluştur
    INSERT INTO push_tokens (
      user_id,
      token,
      device_id,
      device_type,
      active,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_token,
      p_device_id,
      p_device_type,
      TRUE,
      NOW(),
      NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kullanıcının bildirimlerini getiren fonksiyon
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_user_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_include_read BOOLEAN DEFAULT FALSE
)
RETURNS SETOF notifications AS $$
BEGIN
  RETURN QUERY
  SELECT n.*
  FROM notifications n
  WHERE n.user_id = p_user_id
    AND (p_include_read = TRUE OR n.is_read = FALSE)
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Global bildirimleri getiren fonksiyon
CREATE OR REPLACE FUNCTION get_global_notifications(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  message TEXT,
  type TEXT,
  image_url TEXT,
  is_read BOOLEAN,
  priority INT,
  deep_link TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gn.id,
    gn.title,
    gn.message,
    gn.type,
    gn.image_url,
    COALESCE(nr.is_read, FALSE) as is_read,
    gn.priority,
    gn.deep_link,
    gn.created_at
  FROM global_notifications gn
  LEFT JOIN user_notification_reads nr ON nr.global_notification_id = gn.id AND nr.user_id = p_user_id
  WHERE gn.active = TRUE
    AND (gn.expires_at IS NULL OR gn.expires_at > NOW())
  ORDER BY gn.priority DESC, gn.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 