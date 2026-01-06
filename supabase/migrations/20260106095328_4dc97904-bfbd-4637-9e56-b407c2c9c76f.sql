-- Tighten translation_feedback RLS and add SELECT policy
-- Goals:
-- 1) Prevent unauthenticated users from spoofing user_id on INSERT
-- 2) Allow authenticated users to SELECT only their own feedback

DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.translation_feedback;

CREATE POLICY "Users can insert feedback (anonymous or own)"
ON public.translation_feedback
FOR INSERT
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

CREATE POLICY "Users can view own feedback"
ON public.translation_feedback
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);
