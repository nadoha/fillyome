-- Add content classification and masking fields to translations table
ALTER TABLE public.translations 
ADD COLUMN content_classification text DEFAULT 'safe',
ADD COLUMN masked_source_text text,
ADD COLUMN masked_target_text text;

-- Add delete policy
CREATE POLICY "Allow public delete" 
ON public.translations 
FOR DELETE 
USING (true);