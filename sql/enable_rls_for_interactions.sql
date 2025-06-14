-- Enable Row Level Security for user_interactions table
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- Create a stored procedure to insert interactions
-- This allows bypassing RLS while still only allowing authenticated operations
CREATE OR REPLACE FUNCTION public.create_user_interaction(
  p_user_id UUID,
  p_target_user_id UUID,
  p_interaction_type TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_interactions (user_id, target_user_id, interaction_type)
  VALUES (p_user_id, p_target_user_id, p_interaction_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policy for authenticated users to read their own interactions
CREATE POLICY "Users can read own interactions" 
  ON public.user_interactions 
  FOR SELECT 
  USING (auth.uid()::text = user_id::text OR auth.uid()::text = target_user_id::text);

-- Create policy for authenticated users to insert their own interactions
CREATE POLICY "Users can insert own interactions" 
  ON public.user_interactions 
  FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id::text);

-- Create policy for authenticated users to update their own interactions
CREATE POLICY "Users can update own interactions" 
  ON public.user_interactions 
  FOR UPDATE 
  USING (auth.uid()::text = user_id::text);

-- Grant permission to use the function to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_interaction TO authenticated;

-- Grant access to the table to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_interactions TO authenticated; 