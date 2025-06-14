-- Kullanıcı eşleşme sorguları için engelleme durumunu kontrol et
CREATE OR REPLACE FUNCTION get_potential_matches(current_user_id UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  profile_photo TEXT,
  birth_date DATE,
  -- Diğer gerekli alanlar da burada olabilir
  match_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.first_name,
    u.last_name,
    u.profile_photo,
    u.birth_date,
    -- Diğer gerekli alanlar da burada olabilir
    COALESCE(match_algorithm(current_user_id, u.id), 0) AS match_score
  FROM users u
  WHERE 
    -- Kendisi olmayan
    u.id != current_user_id
    -- Ve engellenmeyen kullanıcıları getir
    AND NOT EXISTS (
      SELECT 1 FROM user_blocks 
      WHERE (blocker_id = current_user_id AND blocked_user_id = u.id)
         OR (blocker_id = u.id AND blocked_user_id = current_user_id)
    )
    -- Diğer filtreleme kriterleri burada olabilir
  ORDER BY match_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Mesajlaşma sorguları için engelleme durumunu kontrol et
CREATE OR REPLACE FUNCTION get_user_chats(current_user_id UUID)
RETURNS TABLE (
  chat_id UUID,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_photo TEXT,
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH chat_participants AS (
    SELECT 
      c.id AS chat_id,
      CASE 
        WHEN cp.user_id = current_user_id THEN cp2.user_id
        ELSE cp.user_id
      END AS other_user_id
    FROM chats c
    JOIN chat_participants cp ON c.id = cp.chat_id AND cp.user_id = current_user_id
    JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id != current_user_id
  )
  SELECT 
    cp.chat_id,
    cp.other_user_id,
    u.first_name || ' ' || u.last_name AS other_user_name,
    u.profile_photo AS other_user_photo,
    m.content AS last_message,
    m.created_at AS last_message_time,
    COUNT(CASE WHEN m.is_read = FALSE AND m.sender_id != current_user_id THEN 1 END) AS unread_count
  FROM chat_participants cp
  JOIN users u ON cp.other_user_id = u.id
  LEFT JOIN messages m ON m.chat_id = cp.chat_id AND m.id = (
    SELECT m2.id FROM messages m2 
    WHERE m2.chat_id = cp.chat_id 
    ORDER BY m2.created_at DESC 
    LIMIT 1
  )
  -- Engellenmiş kullanıcıları hariç tut
  WHERE NOT EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE (blocker_id = current_user_id AND blocked_user_id = cp.other_user_id)
       OR (blocker_id = cp.other_user_id AND blocked_user_id = current_user_id)
  )
  GROUP BY cp.chat_id, cp.other_user_id, u.first_name, u.last_name, u.profile_photo, m.content, m.created_at
  ORDER BY last_message_time DESC;
END;
$$ LANGUAGE plpgsql;

-- Uygulama içi mesaj gönderme kontrollerini güncelle
CREATE OR REPLACE FUNCTION send_message(sender_id UUID, receiver_id UUID, message_content TEXT)
RETURNS UUID AS $$
DECLARE
  chat_id UUID;
  new_message_id UUID;
  is_blocked BOOLEAN;
BEGIN
  -- Engelleme durumunu kontrol et
  SELECT EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE (blocker_id = sender_id AND blocked_user_id = receiver_id)
       OR (blocker_id = receiver_id AND blocked_user_id = sender_id)
  ) INTO is_blocked;
  
  -- Engellenmiş ise mesaj gönderme
  IF is_blocked THEN
    RAISE EXCEPTION 'Mesaj gönderilemez. Kullanıcı engellenmiş durumda.';
  END IF;
  
  -- Mevcut sohbet var mı kontrol et
  SELECT cp.chat_id INTO chat_id
  FROM chat_participants cp
  JOIN chat_participants cp2 ON cp.chat_id = cp2.chat_id AND cp2.user_id = receiver_id
  WHERE cp.user_id = sender_id
  LIMIT 1;
  
  -- Sohbet yoksa yeni oluştur
  IF chat_id IS NULL THEN
    INSERT INTO chats (created_at) VALUES (NOW()) RETURNING id INTO chat_id;
    
    INSERT INTO chat_participants (chat_id, user_id) VALUES 
      (chat_id, sender_id),
      (chat_id, receiver_id);
  END IF;
  
  -- Mesajı kaydet
  INSERT INTO messages (chat_id, sender_id, content, created_at, is_read)
  VALUES (chat_id, sender_id, message_content, NOW(), FALSE)
  RETURNING id INTO new_message_id;
  
  RETURN new_message_id;
END;
$$ LANGUAGE plpgsql; 