-- Create table for storing OTP codes
CREATE TABLE public.otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_otp_codes_email ON public.otp_codes(email);
CREATE INDEX idx_otp_codes_expires_at ON public.otp_codes(expires_at);

-- Enable RLS (but allow public insert for registration flow)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Policy to allow inserting OTP codes (needed for registration)
CREATE POLICY "Allow insert for OTP generation"
ON public.otp_codes
FOR INSERT
WITH CHECK (true);

-- Policy to allow selecting for verification
CREATE POLICY "Allow select for OTP verification"
ON public.otp_codes
FOR SELECT
USING (true);

-- Policy to allow updating for marking as verified
CREATE POLICY "Allow update for OTP verification"
ON public.otp_codes
FOR UPDATE
USING (true);

-- Policy to allow deleting expired OTPs
CREATE POLICY "Allow delete expired OTPs"
ON public.otp_codes
FOR DELETE
USING (expires_at < now());

-- Create function to clean up expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM public.otp_codes WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;