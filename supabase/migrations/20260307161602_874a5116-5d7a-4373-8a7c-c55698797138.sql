
-- Make complaints bucket private
UPDATE storage.buckets SET public = false WHERE id = 'complaints';

-- Drop the unrestricted public SELECT policy
DROP POLICY IF EXISTS "Anyone can view complaint images" ON storage.objects;

-- Create role-based read policy for authenticated users
CREATE POLICY "Authenticated users can view complaint images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'complaints'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'engineer')
  )
);
