-- Create context_cards_cache table for caching AI-generated context cards
CREATE TABLE public.context_cards_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  source_text TEXT NOT NULL,
  target_text TEXT NOT NULL,
  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  alternatives JSONB DEFAULT '[]'::jsonb,
  usage_cards JSONB DEFAULT '[]'::jsonb,
  usage_example JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days')
);

-- Create index for fast lookups by cache_key
CREATE INDEX idx_context_cards_cache_key ON public.context_cards_cache(cache_key);

-- Create index for expiration cleanup
CREATE INDEX idx_context_cards_expires_at ON public.context_cards_cache(expires_at);

-- Enable RLS (public read, no direct writes - only via edge functions)
ALTER TABLE public.context_cards_cache ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cached context cards (for performance)
CREATE POLICY "Context cards cache is publicly readable"
ON public.context_cards_cache
FOR SELECT
USING (true);

-- Trigger for updating updated_at
CREATE TRIGGER update_context_cards_cache_updated_at
BEFORE UPDATE ON public.context_cards_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();