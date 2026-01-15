-- 학습 설정 테이블 (잠금 해제 조건 등 설정 가능)
CREATE TABLE public.learning_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  min_translations_for_unlock INTEGER NOT NULL DEFAULT 30,
  min_vocabulary_for_unlock INTEGER NOT NULL DEFAULT 20,
  jlpt_level TEXT NOT NULL DEFAULT 'N5',
  correct_rate NUMERIC DEFAULT 0.7,
  total_questions_answered INTEGER DEFAULT 0,
  total_correct_answers INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.learning_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own settings" 
ON public.learning_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
ON public.learning_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.learning_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Update trigger
CREATE TRIGGER update_learning_settings_updated_at
BEFORE UPDATE ON public.learning_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- AI 생성 학습 문제 테이블
CREATE TABLE public.learning_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_type TEXT NOT NULL, -- 'fill_blank', 'meaning_choice', 'word_order'
  source_type TEXT NOT NULL, -- 'recent', 'frequent', 'saved', 'ai_generated'
  source_label TEXT NOT NULL, -- 표시 라벨 텍스트
  difficulty_level TEXT NOT NULL DEFAULT 'N5', -- N5-N1
  original_translation_id UUID REFERENCES public.translations(id) ON DELETE SET NULL,
  original_vocabulary_id UUID REFERENCES public.vocabulary(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  question_data JSONB NOT NULL, -- 문제 데이터 (옵션, 정답 등)
  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  was_answered BOOLEAN DEFAULT false,
  was_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own questions" 
ON public.learning_questions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own questions" 
ON public.learning_questions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questions" 
ON public.learning_questions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own questions" 
ON public.learning_questions 
FOR DELETE 
USING (auth.uid() = user_id);