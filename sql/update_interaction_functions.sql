-- Etkileşim güncellemesi veya oluşturma için stored procedure oluştur
CREATE OR REPLACE FUNCTION public.create_or_update_user_interaction(
  p_user_id UUID,
  p_target_user_id UUID,
  p_interaction_type TEXT
) RETURNS VOID AS $$
BEGIN
  -- Önce mevcut bir etkileşim var mı kontrol et
  IF EXISTS (
    SELECT 1 FROM public.user_interactions 
    WHERE user_id = p_user_id AND target_user_id = p_target_user_id
  ) THEN
    -- Eğer varsa güncelle
    UPDATE public.user_interactions 
    SET interaction_type = p_interaction_type
    WHERE user_id = p_user_id AND target_user_id = p_target_user_id;
  ELSE
    -- Eğer yoksa yeni bir etkileşim oluştur
    INSERT INTO public.user_interactions (user_id, target_user_id, interaction_type)
    VALUES (p_user_id, p_target_user_id, p_interaction_type);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stored procedure için yetkilendirme
GRANT EXECUTE ON FUNCTION public.create_or_update_user_interaction TO authenticated;
