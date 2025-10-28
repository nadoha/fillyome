-- Add user_id column to translation_feedback table
ALTER TABLE public.translation_feedback
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing records to set user_id to NULL (these are orphaned records)
-- In production, you might want to delete these or assign them to a specific user
UPDATE public.translation_feedback
SET user_id = NULL
WHERE user_id IS NULL;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow public read feedback" ON public.translation_feedback;
DROP POLICY IF EXISTS "Allow public insert feedback" ON public.translation_feedback;

-- Create user-scoped policies for authenticated users only
CREATE POLICY "Users can view own feedback"
ON public.translation_feedback
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
ON public.translation_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
ON public.translation_feedback
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own feedback"
ON public.translation_feedback
FOR DELETE
USING (auth.uid() = user_id);