-- Template questions table for JLPT level-based questions (30% of total)
-- These are shared across all users and don't require AI generation
CREATE TABLE public.template_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jlpt_level TEXT NOT NULL DEFAULT 'N5',
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_data JSONB NOT NULL,
  source_lang TEXT NOT NULL DEFAULT 'ja',
  target_lang TEXT NOT NULL DEFAULT 'ko',
  category TEXT, -- grammar, vocabulary, expression, etc.
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for efficient level-based queries
CREATE INDEX idx_template_questions_level ON public.template_questions(jlpt_level);
CREATE INDEX idx_template_questions_category ON public.template_questions(category);

-- Enable RLS but allow read access to all authenticated users
ALTER TABLE public.template_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read template questions"
ON public.template_questions
FOR SELECT
USING (true);

-- Add queue management columns to learning_questions
ALTER TABLE public.learning_questions 
ADD COLUMN IF NOT EXISTS is_from_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS template_question_id UUID REFERENCES public.template_questions(id),
ADD COLUMN IF NOT EXISTS queued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS served_at TIMESTAMP WITH TIME ZONE;

-- Index for efficient queue queries
CREATE INDEX IF NOT EXISTS idx_learning_questions_queue 
ON public.learning_questions(user_id, was_answered, queued_at)
WHERE was_answered = false;

-- Insert initial N5 template questions (basic greetings and common expressions)
INSERT INTO public.template_questions (jlpt_level, question_type, question_text, question_data, category) VALUES
('N5', 'meaning_choice', 'おはようございます', '{"options": ["안녕하세요 (아침)", "안녕히 가세요", "감사합니다", "죄송합니다"], "correct_answer": "안녕하세요 (아침)"}', 'greeting'),
('N5', 'meaning_choice', 'こんにちは', '{"options": ["안녕하세요 (낮)", "안녕히 주무세요", "잘 먹겠습니다", "처음 뵙겠습니다"], "correct_answer": "안녕하세요 (낮)"}', 'greeting'),
('N5', 'meaning_choice', 'ありがとうございます', '{"options": ["감사합니다", "미안합니다", "실례합니다", "잘 부탁드립니다"], "correct_answer": "감사합니다"}', 'greeting'),
('N5', 'meaning_choice', 'すみません', '{"options": ["죄송합니다/실례합니다", "감사합니다", "안녕하세요", "잘 가세요"], "correct_answer": "죄송합니다/실례합니다"}', 'greeting'),
('N5', 'meaning_choice', 'いただきます', '{"options": ["잘 먹겠습니다", "잘 먹었습니다", "맛있어요", "배고파요"], "correct_answer": "잘 먹겠습니다"}', 'expression'),
('N5', 'meaning_choice', 'ごちそうさまでした', '{"options": ["잘 먹었습니다", "잘 먹겠습니다", "맛있었어요", "배불러요"], "correct_answer": "잘 먹었습니다"}', 'expression'),
('N5', 'meaning_choice', '大丈夫', '{"options": ["괜찮아요", "위험해요", "아파요", "피곤해요"], "correct_answer": "괜찮아요"}', 'expression'),
('N5', 'meaning_choice', 'お願いします', '{"options": ["부탁드립니다", "감사합니다", "미안합니다", "안녕하세요"], "correct_answer": "부탁드립니다"}', 'expression'),
('N5', 'meaning_choice', '分かりました', '{"options": ["알겠습니다", "모르겠어요", "잊어버렸어요", "기억해요"], "correct_answer": "알겠습니다"}', 'expression'),
('N5', 'meaning_choice', 'ちょっと待ってください', '{"options": ["잠깐만 기다려 주세요", "빨리 와 주세요", "여기 앉아 주세요", "저기 가 주세요"], "correct_answer": "잠깐만 기다려 주세요"}', 'expression'),

-- N4 template questions
('N4', 'meaning_choice', '楽しみにしています', '{"options": ["기대하고 있어요", "걱정하고 있어요", "후회하고 있어요", "포기하고 있어요"], "correct_answer": "기대하고 있어요"}', 'expression'),
('N4', 'meaning_choice', 'お疲れ様でした', '{"options": ["수고하셨습니다", "잘 주무세요", "조심하세요", "빨리 나으세요"], "correct_answer": "수고하셨습니다"}', 'expression'),
('N4', 'meaning_choice', 'なるほど', '{"options": ["그렇군요/아하", "그래요?", "정말요?", "거짓말이죠?"], "correct_answer": "그렇군요/아하"}', 'expression'),
('N4', 'meaning_choice', '久しぶり', '{"options": ["오랜만이에요", "처음 뵙겠습니다", "자주 만나네요", "또 만났네요"], "correct_answer": "오랜만이에요"}', 'greeting'),
('N4', 'meaning_choice', 'ご無沙汰しております', '{"options": ["오랫동안 연락드리지 못했습니다", "처음 뵙겠습니다", "잘 부탁드립니다", "감사합니다"], "correct_answer": "오랫동안 연락드리지 못했습니다"}', 'greeting'),

-- N3 template questions
('N3', 'meaning_choice', '一石二鳥', '{"options": ["일석이조", "일거양득", "백전백승", "일일이"], "correct_answer": "일석이조"}', 'idiom'),
('N3', 'meaning_choice', 'さすが', '{"options": ["역시/과연", "아마도", "어쩐지", "혹시"], "correct_answer": "역시/과연"}', 'expression'),
('N3', 'meaning_choice', 'とりあえず', '{"options": ["일단/우선", "결국", "드디어", "마침내"], "correct_answer": "일단/우선"}', 'expression'),
('N3', 'meaning_choice', 'なんとなく', '{"options": ["왠지/그냥", "확실히", "분명히", "당연히"], "correct_answer": "왠지/그냥"}', 'expression'),
('N3', 'meaning_choice', 'せっかく', '{"options": ["모처럼/일부러", "갑자기", "우연히", "자연스럽게"], "correct_answer": "모처럼/일부러"}', 'expression'),

-- N2 template questions
('N2', 'meaning_choice', '腑に落ちない', '{"options": ["납득이 안 되다", "기억이 안 나다", "말이 안 통하다", "마음에 안 들다"], "correct_answer": "납득이 안 되다"}', 'idiom'),
('N2', 'meaning_choice', '水に流す', '{"options": ["과거를 잊다/없던 일로 하다", "물에 빠지다", "실패하다", "포기하다"], "correct_answer": "과거를 잊다/없던 일로 하다"}', 'idiom'),
('N2', 'meaning_choice', '気が置けない', '{"options": ["편하다/스스럼없다", "불편하다", "긴장되다", "조심스럽다"], "correct_answer": "편하다/스스럼없다"}', 'idiom'),

-- N1 template questions
('N1', 'meaning_choice', '青天の霹靂', '{"options": ["청천벽력/갑작스러운 충격", "맑은 하늘", "천둥번개", "폭풍우"], "correct_answer": "청천벽력/갑작스러운 충격"}', 'idiom'),
('N1', 'meaning_choice', '以心伝心', '{"options": ["이심전심", "마음대로", "심사숙고", "일심동체"], "correct_answer": "이심전심"}', 'idiom');