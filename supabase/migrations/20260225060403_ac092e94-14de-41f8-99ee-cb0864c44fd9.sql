
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can only view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
