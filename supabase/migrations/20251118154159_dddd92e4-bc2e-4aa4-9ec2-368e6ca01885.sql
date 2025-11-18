-- Add spaced repetition fields to vocabulary table
ALTER TABLE vocabulary
ADD COLUMN IF NOT EXISTS next_review TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ease_factor DECIMAL DEFAULT 2.5,
ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_reviewed TIMESTAMP WITH TIME ZONE;

-- Create learning_sessions table for tracking study sessions
CREATE TABLE IF NOT EXISTS learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  words_studied INTEGER DEFAULT 0,
  words_reviewed INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_answers INTEGER DEFAULT 0,
  study_duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on learning_sessions
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for learning_sessions
CREATE POLICY "Users can view their own sessions"
ON learning_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
ON learning_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON learning_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
ON learning_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Create quiz_results table for tracking quiz performance
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  vocabulary_id UUID REFERENCES vocabulary(id) ON DELETE CASCADE,
  was_correct BOOLEAN NOT NULL,
  quiz_type TEXT NOT NULL, -- 'flashcard', 'multiple_choice', 'typing'
  response_time_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on quiz_results
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for quiz_results
CREATE POLICY "Users can view their own quiz results"
ON quiz_results FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz results"
ON quiz_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to update session stats
CREATE OR REPLACE FUNCTION update_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session updates
DROP TRIGGER IF EXISTS update_learning_sessions_updated_at ON learning_sessions;
CREATE TRIGGER update_learning_sessions_updated_at
BEFORE UPDATE ON learning_sessions
FOR EACH ROW
EXECUTE FUNCTION update_session_updated_at();