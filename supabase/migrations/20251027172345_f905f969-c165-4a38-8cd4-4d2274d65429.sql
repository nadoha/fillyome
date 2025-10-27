-- Add feedback_type column to translation_feedback table
ALTER TABLE public.translation_feedback 
ADD COLUMN IF NOT EXISTS feedback_type text NOT NULL DEFAULT 'positive' CHECK (feedback_type IN ('positive', 'negative'));