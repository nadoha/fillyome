-- Harden access to anonymized translations analytics view
-- Goal: ensure view cannot bypass RLS via view owner and is not publicly selectable.

CREATE OR REPLACE VIEW public.translations_anonymized
WITH (security_invoker = on, security_barrier = true) AS
SELECT
  id,
  length(source_text) AS source_text_length,
  length(target_text) AS target_text_length,
  source_lang,
  target_lang,
  content_classification,
  is_favorite,
  created_at,
  encode(sha256(user_id::text::bytea), 'hex') AS anonymized_user_hash
FROM public.translations;

-- Restrict direct access from client roles
REVOKE ALL ON public.translations_anonymized FROM PUBLIC;
REVOKE ALL ON public.translations_anonymized FROM anon;
REVOKE ALL ON public.translations_anonymized FROM authenticated;

-- Allow backend service role to read for internal analytics/operations
GRANT SELECT ON public.translations_anonymized TO service_role;