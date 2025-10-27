-- Create translations table for storing translation history
CREATE TABLE public.translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  source_text TEXT NOT NULL,
  target_text TEXT NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read translations (MVP - no auth yet)
CREATE POLICY "Allow public read access" 
ON public.translations 
FOR SELECT 
USING (true);

-- Create policy to allow anyone to insert translations (MVP - no auth yet)
CREATE POLICY "Allow public insert" 
ON public.translations 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow anyone to update translations (MVP - no auth yet)
CREATE POLICY "Allow public update" 
ON public.translations 
FOR UPDATE 
USING (true);

-- Create index for faster queries on created_at
CREATE INDEX idx_translations_created_at ON public.translations(created_at DESC);

-- Create index for favorite filtering
CREATE INDEX idx_translations_favorite ON public.translations(is_favorite) WHERE is_favorite = true;