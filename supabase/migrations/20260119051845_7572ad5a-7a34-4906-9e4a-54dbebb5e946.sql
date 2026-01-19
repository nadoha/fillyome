-- Ensure translations_anonymized view is properly secured
-- Revoke all access from public roles
REVOKE ALL ON public.translations_anonymized FROM PUBLIC;
REVOKE ALL ON public.translations_anonymized FROM anon;
REVOKE ALL ON public.translations_anonymized FROM authenticated;

-- Grant access only to service_role (for internal analytics)
GRANT SELECT ON public.translations_anonymized TO service_role;