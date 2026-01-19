-- =====================================================
-- 1. Fix template_questions: Remove public read policy, restrict to service_role only
-- =====================================================

-- Drop the existing permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read template questions" ON public.template_questions;

-- Revoke all direct access from public roles
REVOKE ALL ON public.template_questions FROM PUBLIC;
REVOKE ALL ON public.template_questions FROM anon;
REVOKE ALL ON public.template_questions FROM authenticated;

-- Grant access only to service_role (edge functions use service_role)
GRANT SELECT, UPDATE ON public.template_questions TO service_role;

-- =====================================================
-- 2. Ensure translations_anonymized view is properly secured
-- (Re-apply in case previous migration was incomplete)
-- =====================================================

-- Revoke all access from public roles
REVOKE ALL ON public.translations_anonymized FROM PUBLIC;
REVOKE ALL ON public.translations_anonymized FROM anon;
REVOKE ALL ON public.translations_anonymized FROM authenticated;

-- Grant access only to service_role
GRANT SELECT ON public.translations_anonymized TO service_role;