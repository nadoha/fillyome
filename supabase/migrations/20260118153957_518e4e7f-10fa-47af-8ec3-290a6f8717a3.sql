-- Fix: Restrict template_questions to authenticated users only
-- This prevents anonymous scraping of educational content

-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Anyone can read template questions" ON public.template_questions;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can read template questions"
ON public.template_questions
FOR SELECT
TO authenticated
USING (true);