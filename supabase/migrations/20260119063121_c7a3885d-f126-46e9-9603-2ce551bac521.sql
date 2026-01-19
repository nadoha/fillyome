-- =====================================================
-- Add RLS policies for template_questions table
-- Currently has RLS enabled but no policies defined
-- =====================================================

-- Policy 1: Block all direct client access (deny by default)
CREATE POLICY "Block direct public access"
ON public.template_questions
FOR ALL
TO PUBLIC
USING (false)
WITH CHECK (false);

-- Policy 2: Block anonymous access explicitly
CREATE POLICY "Block anonymous access"
ON public.template_questions
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Policy 3: Block authenticated user direct access
-- (template questions are accessed via service_role in edge functions)
CREATE POLICY "Block authenticated direct access"
ON public.template_questions
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Note: service_role bypasses RLS by default, so edge functions can still access
-- The grants already in place (SELECT, UPDATE to service_role) work correctly