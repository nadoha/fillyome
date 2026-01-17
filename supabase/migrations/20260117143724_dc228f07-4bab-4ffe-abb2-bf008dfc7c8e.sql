-- learning_settings 테이블에 번역 기록 저장 설정 추가
ALTER TABLE public.learning_settings 
ADD COLUMN IF NOT EXISTS save_translation_history boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.learning_settings.save_translation_history IS '번역 기록 저장 여부. 기본값 OFF, 사용자가 명시적으로 켜야 저장됨.';