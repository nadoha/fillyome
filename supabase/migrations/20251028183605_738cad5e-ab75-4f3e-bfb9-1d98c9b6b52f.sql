-- Clean up NULL user_id rows (these are orphaned records that can't be accessed)
DELETE FROM public.translations WHERE user_id IS NULL;

-- Now make user_id NOT NULL to prevent future data orphaning
ALTER TABLE public.translations 
ALTER COLUMN user_id SET NOT NULL;