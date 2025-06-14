-- Eşleşme bildirimi tetikleyicisi
CREATE OR REPLACE FUNCTION notify_on_new_match()
RETURNS TRIGGER AS $$
DECLARE
    v_title TEXT;
    v_message TEXT;
    v_user_name TEXT;
    v_user_profile_image TEXT;
BEGIN
    -- Eşleşen kullanıcının bilgilerini al
    SELECT 
        first_name, 
        COALESCE(profile_image_url, '') 
    INTO 
        v_user_name, 
        v_user_profile_image
    FROM 
        public.users 
    WHERE 
        id = NEW.user1_id;
    
    -- Karşı taraf için bildirim oluştur
    v_title := 'Yeni Eşleşme!';
    v_message := v_user_name || ' ile eşleştin. Hemen mesajlaşmaya başla!';
    
    PERFORM public.create_user_notification(
        NEW.user2_id,  -- Alıcı kullanıcı
        v_title,
        v_message,
        'match',
        v_user_profile_image,  -- Eşleşen kullanıcının profil resmi
        NEW.user1_id,  -- Gönderen kullanıcı
        NEW.id,  -- İlgili varlık ID (match)
        'match'  -- İlgili varlık tipi
    );
    
    -- Eşleşen kullanıcının adını al (diğer taraf için)
    SELECT 
        first_name, 
        COALESCE(profile_image_url, '') 
    INTO 
        v_user_name, 
        v_user_profile_image
    FROM 
        public.users 
    WHERE 
        id = NEW.user2_id;
    
    -- İlk kullanıcı için bildirim oluştur
    v_title := 'Yeni Eşleşme!';
    v_message := v_user_name || ' ile eşleştin. Hemen mesajlaşmaya başla!';
    
    PERFORM public.create_user_notification(
        NEW.user1_id,  -- Alıcı kullanıcı
        v_title,
        v_message,
        'match',
        v_user_profile_image,  -- Eşleşen kullanıcının profil resmi
        NEW.user2_id,  -- Gönderen kullanıcı
        NEW.id,  -- İlgili varlık ID (match)
        'match'  -- İlgili varlık tipi
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Beğeni bildirimi tetikleyicisi
CREATE OR REPLACE FUNCTION notify_on_new_like()
RETURNS TRIGGER AS $$
DECLARE
    v_title TEXT;
    v_message TEXT;
    v_user_name TEXT;
    v_user_profile_image TEXT;
BEGIN
    -- Beğenen kullanıcının bilgilerini al
    SELECT 
        first_name, 
        COALESCE(profile_image_url, '') 
    INTO 
        v_user_name, 
        v_user_profile_image
    FROM 
        public.users 
    WHERE 
        id = NEW.from_user_id;
    
    -- Beğeni tipi ne?
    IF NEW.like_type = 'superlike' THEN
        v_title := 'Süper Beğeni Aldın!';
        v_message := v_user_name || ' profilini süper beğendi!';
        
        PERFORM public.create_user_notification(
            NEW.to_user_id,  -- Alıcı kullanıcı
            v_title,
            v_message,
            'superlike',
            v_user_profile_image,  -- Beğenen kullanıcının profil resmi
            NEW.from_user_id,  -- Gönderen kullanıcı
            NEW.id,  -- İlgili varlık ID (like)
            'like'  -- İlgili varlık tipi
        );
    ELSE
        v_title := 'Yeni Beğeni!';
        v_message := v_user_name || ' profilini beğendi.';
        
        PERFORM public.create_user_notification(
            NEW.to_user_id,  -- Alıcı kullanıcı
            v_title,
            v_message,
            'like',
            v_user_profile_image,  -- Beğenen kullanıcının profil resmi
            NEW.from_user_id,  -- Gönderen kullanıcı
            NEW.id,  -- İlgili varlık ID (like)
            'like'  -- İlgili varlık tipi
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Mesaj bildirimi tetikleyicisi
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
    v_title TEXT;
    v_message TEXT;
    v_user_name TEXT;
    v_user_profile_image TEXT;
    v_match_id UUID;
    v_receiver_id UUID;
BEGIN
    -- Önce match_id'yi kullanarak alıcı kullanıcıyı bul
    SELECT 
        CASE 
            WHEN user1_id = NEW.sender_id THEN user2_id
            ELSE user1_id
        END INTO v_receiver_id
    FROM 
        public.matches
    WHERE 
        id = NEW.match_id;
    
    -- Mesajı gönderen kullanıcının bilgilerini al
    SELECT 
        first_name, 
        COALESCE(profile_image_url, '') 
    INTO 
        v_user_name, 
        v_user_profile_image
    FROM 
        public.users 
    WHERE 
        id = NEW.sender_id;
    
    -- Bildirim oluştur
    v_title := 'Yeni Mesaj';
    
    -- Mesajın içeriğine göre bildirim metnini oluştur
    IF NEW.message_type = 'text' THEN
        v_message := v_user_name || ': ' || SUBSTRING(NEW.content FROM 1 FOR 50);
        IF LENGTH(NEW.content) > 50 THEN
            v_message := v_message || '...';
        END IF;
    ELSIF NEW.message_type = 'image' THEN
        v_message := v_user_name || ' sana bir fotoğraf gönderdi.';
    ELSIF NEW.message_type = 'voice' THEN
        v_message := v_user_name || ' sana bir sesli mesaj gönderdi.';
    ELSE
        v_message := v_user_name || ' sana yeni bir mesaj gönderdi.';
    END IF;
    
    PERFORM public.create_user_notification(
        v_receiver_id,  -- Alıcı kullanıcı
        v_title,
        v_message,
        'message',
        v_user_profile_image,  -- Gönderen kullanıcının profil resmi
        NEW.sender_id,  -- Gönderen kullanıcı
        NEW.id,  -- İlgili varlık ID (message)
        'message'  -- İlgili varlık tipi
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tetikleyicileri tablolara bağla

-- Eşleşme tetikleyicisi
DROP TRIGGER IF EXISTS matches_notify_trigger ON public.matches;
CREATE TRIGGER matches_notify_trigger
AFTER INSERT ON public.matches
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_match();

-- Beğeni tetikleyicisi
DROP TRIGGER IF EXISTS likes_notify_trigger ON public.likes;
CREATE TRIGGER likes_notify_trigger
AFTER INSERT ON public.likes
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_like();

-- Mesaj tetikleyicisi
DROP TRIGGER IF EXISTS messages_notify_trigger ON public.messages;
CREATE TRIGGER messages_notify_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_message(); 