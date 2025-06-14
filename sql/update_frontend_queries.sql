-- Frontend tarafından yapılan sorgular için engelleme durumunu kontrol eden RPC fonksiyonları

-- Kullanıcı engelleme durumunu kontrol eden RPC
CREATE OR REPLACE FUNCTION check_block_status(current_user_id UUID, target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  is_blocked BOOLEAN;
  is_blocked_by BOOLEAN;
  result JSONB;
BEGIN
  -- Kullanıcının karşı tarafı engelleyip engellemediğini kontrol et
  SELECT EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE blocker_id = current_user_id AND blocked_user_id = target_user_id
  ) INTO is_blocked;
  
  -- Karşı tarafın kullanıcıyı engelleyip engellemediğini kontrol et
  SELECT EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE blocker_id = target_user_id AND blocked_user_id = current_user_id
  ) INTO is_blocked_by;
  
  -- Sonucu JSON olarak döndür
  result := jsonb_build_object(
    'is_blocked', is_blocked,
    'is_blocked_by', is_blocked_by,
    'is_any_block', is_blocked OR is_blocked_by
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Tüm potansiyel eşleşmeleri (engellenenler hariç) getiren RPC
CREATE OR REPLACE FUNCTION get_filtered_users(
  current_user_id UUID,
  age_min INTEGER DEFAULT 18,
  age_max INTEGER DEFAULT 99,
  distance_max INTEGER DEFAULT 100,
  limit_count INTEGER DEFAULT 20
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH filtered_users AS (
    SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.profile_photo,
      u.birth_date,
      u.location,
      u.biography,
      u.hobbies,
      EXTRACT(YEAR FROM AGE(NOW(), u.birth_date)) AS age,
      -- Mesafe hesaplama (basitleştirilmiş)
      CASE WHEN u.location IS NOT NULL AND (SELECT location FROM users WHERE id = current_user_id) IS NOT NULL THEN
        calculate_distance(
          (u.location->>'latitude')::FLOAT, 
          (u.location->>'longitude')::FLOAT,
          ((SELECT location FROM users WHERE id = current_user_id)->>'latitude')::FLOAT,
          ((SELECT location FROM users WHERE id = current_user_id)->>'longitude')::FLOAT
        )
      ELSE 999999 END AS distance
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
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', fu.id,
      'first_name', fu.first_name,
      'last_name', fu.last_name,
      'profile_photo', fu.profile_photo,
      'age', fu.age,
      'distance', ROUND(fu.distance::NUMERIC, 1),
      'biography', fu.biography,
      'hobbies', fu.hobbies
    )
  )
  INTO result
  FROM filtered_users fu
  WHERE 
    fu.age BETWEEN age_min AND age_max
    AND fu.distance <= distance_max
  ORDER BY 
    -- Buraya uygun sıralama kriterleri eklenebilir
    RANDOM()
  LIMIT limit_count;
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Sohbet mesajlarını getiren RPC (engelleme durumu kontrolü ile)
CREATE OR REPLACE FUNCTION get_chat_messages(
  current_user_id UUID,
  other_user_id UUID,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  chat_id UUID;
  is_blocked BOOLEAN;
  result JSONB;
BEGIN
  -- Engelleme durumunu kontrol et
  SELECT EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE (blocker_id = current_user_id AND blocked_user_id = other_user_id)
       OR (blocker_id = other_user_id AND blocked_user_id = current_user_id)
  ) INTO is_blocked;
  
  -- Engellenmiş ise boş sonuç döndür
  IF is_blocked THEN
    RETURN jsonb_build_object(
      'error', 'blocked',
      'message', 'Bu kullanıcı ile mesajlaşamazsınız.',
      'messages', '[]'::JSONB
    );
  END IF;
  
  -- Mevcut sohbet var mı kontrol et
  SELECT cp.chat_id INTO chat_id
  FROM chat_participants cp
  JOIN chat_participants cp2 ON cp.chat_id = cp2.chat_id AND cp2.user_id = other_user_id
  WHERE cp.user_id = current_user_id
  LIMIT 1;
  
  -- Sohbet yoksa boş mesaj listesi döndür
  IF chat_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', NULL,
      'message', NULL,
      'messages', '[]'::JSONB
    );
  END IF;
  
  -- Mesajları getir
  WITH messages_with_user AS (
    SELECT 
      m.id,
      m.sender_id,
      m.content,
      m.created_at,
      m.is_read,
      jsonb_build_object(
        'id', u.id,
        'first_name', u.first_name,
        'profile_photo', u.profile_photo
      ) AS sender
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.chat_id = chat_id
    ORDER BY m.created_at DESC
    LIMIT limit_count
    OFFSET offset_count
  )
  SELECT jsonb_build_object(
    'error', NULL,
    'message', NULL,
    'messages', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'content', m.content,
        'created_at', m.created_at,
        'is_read', m.is_read,
        'sender', m.sender,
        'is_self', m.sender_id = current_user_id
      ) ORDER BY m.created_at
    ), '[]'::JSONB)
  )
  INTO result
  FROM messages_with_user m;
  
  -- Okunmamış mesajları okundu olarak işaretle
  UPDATE messages 
  SET is_read = TRUE 
  WHERE chat_id = chat_id 
    AND sender_id != current_user_id 
    AND is_read = FALSE;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql; 