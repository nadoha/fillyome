-- Make user_id nullable again for feedback (can be submitted without login)
ALTER TABLE public.translation_feedback
ALTER COLUMN user_id DROP NOT NULL;

-- Drop user-scoped policies
DROP POLICY IF EXISTS "Users can view own feedback" ON public.translation_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.translation_feedback;
DROP POLICY IF EXISTS "Users can update own feedback" ON public.translation_feedback;
DROP POLICY IF EXISTS "Users can delete own feedback" ON public.translation_feedback;

-- Allow anyone to insert feedback (for anonymous users too)
CREATE POLICY "Anyone can insert feedback"
ON public.translation_feedback
FOR INSERT
WITH CHECK (true);

-- Only allow reading feedback through backend/admin access
-- No public SELECT policy means only service role can read
-- This protects user data while allowing feedback collection