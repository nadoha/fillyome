-- 1. translation_feedback 테이블에 SELECT 정책 추가 (자신의 피드백만 조회 가능)
CREATE POLICY "Users can view their own feedback" 
ON public.translation_feedback 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. translation_feedback 테이블에 UPDATE 정책 추가 (자신의 피드백만 수정 가능)
CREATE POLICY "Users can update their own feedback" 
ON public.translation_feedback 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 3. translation_feedback 테이블에 DELETE 정책 추가 (자신의 피드백만 삭제 가능)
CREATE POLICY "Users can delete their own feedback" 
ON public.translation_feedback 
FOR DELETE 
USING (auth.uid() = user_id);