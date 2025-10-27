-- Create translation feedback table
CREATE TABLE public.translation_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  translation_id uuid REFERENCES public.translations(id) ON DELETE CASCADE,
  source_text text NOT NULL,
  natural_translation text NOT NULL,
  literal_translation text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.translation_feedback ENABLE ROW LEVEL SECURITY;

-- Allow public insert
CREATE POLICY "Allow public insert feedback"
ON public.translation_feedback
FOR INSERT
WITH CHECK (true);

-- Allow public read
CREATE POLICY "Allow public read feedback"
ON public.translation_feedback
FOR SELECT
USING (true);