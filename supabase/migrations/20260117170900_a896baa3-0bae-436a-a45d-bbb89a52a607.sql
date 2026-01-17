-- =====================================================
-- 1. translations_anonymized View: service_role 전용으로 변경
-- =====================================================

-- 기존 view 삭제
DROP VIEW IF EXISTS public.translations_anonymized;

-- service_role 전용 view 재생성 (security_barrier로 보호)
CREATE VIEW public.translations_anonymized
WITH (security_barrier=true) AS
SELECT 
    id,
    length(source_text) AS source_text_length,
    length(target_text) AS target_text_length,
    source_lang,
    target_lang,
    content_classification,
    is_favorite,
    created_at,
    encode(sha256(user_id::text::bytea), 'hex'::text) AS anonymized_user_hash
FROM translations;

-- View에 대한 접근 권한 설정: public/authenticated 차단, service_role만 허용
REVOKE ALL ON public.translations_anonymized FROM PUBLIC;
REVOKE ALL ON public.translations_anonymized FROM anon;
REVOKE ALL ON public.translations_anonymized FROM authenticated;

-- =====================================================
-- 2. translation_feedback RLS 수정: authenticated SELECT 제거
-- =====================================================

-- 기존 SELECT 정책 삭제
DROP POLICY IF EXISTS "Users can view own feedback" ON public.translation_feedback;

-- INSERT 정책 수정: 로그인 사용자만 insert 가능 (익명 INSERT 차단)
DROP POLICY IF EXISTS "Users can insert feedback (anonymous or own)" ON public.translation_feedback;

CREATE POLICY "Authenticated users can insert own feedback"
ON public.translation_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 3. learning_questions에 flagged 컬럼 추가 (문제 신고용)
-- =====================================================

-- flagged 컬럼이 없으면 추가
ALTER TABLE public.learning_questions 
ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;

ALTER TABLE public.learning_questions 
ADD COLUMN IF NOT EXISTS flagged_at timestamp with time zone DEFAULT NULL;

-- =====================================================
-- 4. learning_settings 기본값 변경: save_translation_history 기본값 false
-- =====================================================

-- 기본값을 false로 변경 (이미 false이지만 명시적으로 확인)
ALTER TABLE public.learning_settings 
ALTER COLUMN save_translation_history SET DEFAULT false;