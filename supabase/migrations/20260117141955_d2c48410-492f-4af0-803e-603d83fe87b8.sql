-- Add DELETE policy for learning_settings table
CREATE POLICY "Users can delete their own learning settings"
ON public.learning_settings
FOR DELETE
USING (auth.uid() = user_id);