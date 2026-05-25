
-- Fix otp_codes policies - restrict access properly
DROP POLICY IF EXISTS "Allow select for OTP verification" ON public.otp_codes;
DROP POLICY IF EXISTS "Allow update for OTP verification" ON public.otp_codes;
DROP POLICY IF EXISTS "Allow insert for OTP generation" ON public.otp_codes;
DROP POLICY IF EXISTS "Allow delete expired OTPs" ON public.otp_codes;

-- Only allow server-side (service role) access to otp_codes
-- No client-side policies needed since OTP verification goes through edge function
-- Keep delete for cleanup function
CREATE POLICY "Service role only - no client access"
ON public.otp_codes
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Allow the cleanup function to delete expired OTPs (runs as SECURITY DEFINER)
CREATE POLICY "Allow cleanup of expired OTPs"
ON public.otp_codes
FOR DELETE
USING (expires_at < now());
