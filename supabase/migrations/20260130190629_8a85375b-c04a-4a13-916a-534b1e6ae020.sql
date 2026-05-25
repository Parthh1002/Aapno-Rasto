-- Fix function search_path for cleanup_expired_otps
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.otp_codes WHERE expires_at < now();
END;
$function$;

-- Fix overly permissive storage policies by making them more restrictive
DROP POLICY IF EXISTS "Authenticated users can upload complaint images" ON storage.objects;
DROP POLICY IF EXISTS "Engineers can upload resolution images" ON storage.objects;

-- More restrictive policy: users can only upload to their own folder
CREATE POLICY "Users can upload complaint images to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'complaints' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Engineers can upload resolution images to resolution folder
CREATE POLICY "Engineers can upload resolution images to resolution folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'complaints' 
  AND (storage.foldername(name))[1] = 'resolutions'
  AND public.has_role(auth.uid(), 'engineer')
);