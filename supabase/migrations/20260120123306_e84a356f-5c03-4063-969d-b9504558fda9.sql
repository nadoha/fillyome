-- Fix: Restrict access to translations_anonymized view
-- This view contains potentially re-identifiable user translation patterns
-- Only service_role should have access for internal analytics

-- Revoke all access from anon and authenticated roles
REVOKE ALL ON public.translations_anonymized FROM anon;
REVOKE ALL ON public.translations_anonymized FROM authenticated;

-- Grant access only to service_role for internal analytics
GRANT SELECT ON public.translations_anonymized TO service_role;