-- Add literal translation field to translations table
ALTER TABLE public.translations 
ADD COLUMN literal_translation text;