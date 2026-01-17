-- Drop the existing view
DROP VIEW IF EXISTS public.translations_anonymized;

-- Recreate with security_invoker=on to inherit RLS from base table
CREATE VIEW public.translations_anonymized
WITH (security_invoker=on) AS
SELECT 
    id,
    length(source_text) AS source_text_length,
    length(target_text) AS target_text_length,
    source_lang,
    target_lang,
    content_classification,
    is_favorite,
    created_at,
    encode(sha256(user_id::text::bytea), 'hex'::text) AS anonymized_user_hash
FROM translations;