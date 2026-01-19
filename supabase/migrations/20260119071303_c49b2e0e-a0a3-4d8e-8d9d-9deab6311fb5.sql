-- Revoke all public access to translations_anonymized view
REVOKE ALL ON public.translations_anonymized FROM PUBLIC;
REVOKE ALL ON public.translations_anonymized FROM anon;
REVOKE ALL ON public.translations_anonymized FROM authenticated;

-- Grant access only to service_role for analytics purposes
GRANT SELECT ON public.translations_anonymized TO service_role;