-- Add romanization fields to translations table
ALTER TABLE public.translations 
ADD COLUMN source_romanization text,
ADD COLUMN target_romanization text;