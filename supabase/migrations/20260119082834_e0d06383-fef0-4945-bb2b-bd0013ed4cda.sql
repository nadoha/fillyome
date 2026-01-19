-- Ensure no default grants exist for template_questions
REVOKE ALL ON public.template_questions FROM PUBLIC;
REVOKE ALL ON public.template_questions FROM anon;
REVOKE ALL ON public.template_questions FROM authenticated;

-- Ensure service_role has access for edge functions
GRANT SELECT ON public.template_questions TO service_role;

-- Ensure no default grants exist for translations_anonymized view
REVOKE ALL ON public.translations_anonymized FROM PUBLIC;
REVOKE ALL ON public.translations_anonymized FROM anon;
REVOKE ALL ON public.translations_anonymized FROM authenticated;

-- Ensure service_role has access for analytics
GRANT SELECT ON public.translations_anonymized TO service_role;