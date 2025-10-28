-- Add user_id column to translations table (nullable for backward compatibility)
ALTER TABLE public.translations 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop all existing overly permissive policies
DROP POLICY IF EXISTS "Allow public delete" ON public.translations;
DROP POLICY IF EXISTS "Allow public update" ON public.translations;
DROP POLICY IF EXISTS "Allow public insert" ON public.translations;
DROP POLICY IF EXISTS "Allow public read access" ON public.translations;

-- New policies for authenticated and anonymous users
-- Authenticated users can only see and manage their own translations
CREATE POLICY "Authenticated users can view own translations" 
ON public.translations
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own translations" 
ON public.translations
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own translations" 
ON public.translations
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own translations" 
ON public.translations
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Anonymous users can still use the app but data won't be saved to DB
-- They will use localStorage instead (handled in frontend)