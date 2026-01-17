-- 1. 비식별화된 번역 데이터 View 생성 (운영자 분석용)
-- 민감한 원문은 해시 처리, 통계/오류 분석용으로만 사용
CREATE VIEW public.translations_anonymized
WITH (security_invoker = on) AS
SELECT 
  id,
  -- 원문/번역문은 완전히 숨기고 길이만 표시
  length(source_text) as source_text_length,
  length(target_text) as target_text_length,
  source_lang,
  target_lang,
  content_classification,
  is_favorite,
  created_at,
  -- user_id는 해시 처리하여 개인 식별 불가
  encode(sha256(user_id::text::bytea), 'hex') as anonymized_user_hash
FROM public.translations;

-- 2. View에 대한 접근 정책 (인증된 사용자만)
GRANT SELECT ON public.translations_anonymized TO authenticated;

-- 3. 원본 테이블 직접 접근 차단 강화
-- 기존 RLS 정책은 유지 (본인만 접근)
-- service_role만 우회 가능 (이건 서버측 edge function용)

COMMENT ON VIEW public.translations_anonymized IS '운영자 분석용 비식별화 번역 데이터. 원문 미포함, 통계/오류분석 전용.';