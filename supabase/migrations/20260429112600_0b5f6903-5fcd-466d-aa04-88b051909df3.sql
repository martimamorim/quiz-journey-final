CREATE POLICY "Anyone can lookup class by join_code"
ON public.classes
FOR SELECT
TO anon
USING (true);