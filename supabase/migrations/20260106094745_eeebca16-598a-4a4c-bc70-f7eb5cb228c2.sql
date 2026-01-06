-- Add CHECK constraints for text length limits on translation_feedback table
-- This prevents spam and database bloat from oversized submissions

ALTER TABLE public.translation_feedback
ADD CONSTRAINT translation_feedback_source_text_length 
CHECK (char_length(source_text) <= 5000);

ALTER TABLE public.translation_feedback
ADD CONSTRAINT translation_feedback_natural_translation_length 
CHECK (char_length(natural_translation) <= 5000);

ALTER TABLE public.translation_feedback
ADD CONSTRAINT translation_feedback_literal_translation_length 
CHECK (literal_translation IS NULL OR char_length(literal_translation) <= 5000);