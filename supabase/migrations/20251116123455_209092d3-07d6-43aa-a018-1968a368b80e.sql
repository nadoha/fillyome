-- Create vocabulary table for user word collections
CREATE TABLE public.vocabulary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  word TEXT NOT NULL,
  language TEXT NOT NULL,
  definition JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(user_id, word, language)
);

-- Enable Row Level Security
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own vocabulary" 
ON public.vocabulary 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vocabulary" 
ON public.vocabulary 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocabulary" 
ON public.vocabulary 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vocabulary" 
ON public.vocabulary 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_vocabulary_user_id ON public.vocabulary(user_id);
CREATE INDEX idx_vocabulary_language ON public.vocabulary(language);
CREATE INDEX idx_vocabulary_created_at ON public.vocabulary(created_at DESC);