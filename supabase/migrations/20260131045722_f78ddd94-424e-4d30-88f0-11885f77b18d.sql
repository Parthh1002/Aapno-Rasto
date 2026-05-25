-- Add duplicate detection fields to complaints table
ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS is_duplicate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS duplicate_type text CHECK (duplicate_type IN ('exact', 'similar') OR duplicate_type IS NULL),
ADD COLUMN IF NOT EXISTS master_issue_id uuid REFERENCES public.complaints(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS match_confidence numeric CHECK (match_confidence >= 0 AND match_confidence <= 100),
ADD COLUMN IF NOT EXISTS matched_against_issue_id uuid REFERENCES public.complaints(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS match_reason text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS image_hash text;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_complaints_master_issue_id ON public.complaints(master_issue_id);
CREATE INDEX IF NOT EXISTS idx_complaints_image_hash ON public.complaints(image_hash);
CREATE INDEX IF NOT EXISTS idx_complaints_is_duplicate ON public.complaints(is_duplicate);
CREATE INDEX IF NOT EXISTS idx_complaints_lat_lng ON public.complaints(lat, lng);

-- Create a function to find nearby complaints within a radius (in meters)
CREATE OR REPLACE FUNCTION public.find_nearby_complaints(
  p_lat numeric,
  p_lng numeric,
  p_radius_meters numeric,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  distance_meters numeric,
  image_hash text,
  category text,
  sub_category text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    (6371000 * acos(
      cos(radians(p_lat)) * cos(radians(c.lat)) *
      cos(radians(c.lng) - radians(p_lng)) +
      sin(radians(p_lat)) * sin(radians(c.lat))
    ))::numeric AS distance_meters,
    c.image_hash,
    c.category,
    c.sub_category
  FROM public.complaints c
  WHERE c.id != COALESCE(p_exclude_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND c.is_duplicate = false
    AND c.status != 'completed'
    AND (6371000 * acos(
      cos(radians(p_lat)) * cos(radians(c.lat)) *
      cos(radians(c.lng) - radians(p_lng)) +
      sin(radians(p_lat)) * sin(radians(c.lat))
    )) <= p_radius_meters
  ORDER BY distance_meters ASC;
END;
$$;

-- Function to get all complaints linked to a master issue
CREATE OR REPLACE FUNCTION public.get_linked_complaints(p_master_id uuid)
RETURNS SETOF public.complaints
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.complaints
  WHERE master_issue_id = p_master_id OR id = p_master_id
  ORDER BY created_at ASC;
$$;

-- Function to merge complaints under a master issue
CREATE OR REPLACE FUNCTION public.merge_complaints(
  p_master_id uuid,
  p_duplicate_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update all duplicate complaints to point to master
  UPDATE public.complaints
  SET 
    is_duplicate = true,
    master_issue_id = p_master_id,
    duplicate_type = COALESCE(duplicate_type, 'similar')
  WHERE id = ANY(p_duplicate_ids)
    AND id != p_master_id;
END;
$$;

-- Function to unmerge a complaint from its master
CREATE OR REPLACE FUNCTION public.unmerge_complaint(p_complaint_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.complaints
  SET 
    is_duplicate = false,
    duplicate_type = NULL,
    master_issue_id = NULL,
    match_confidence = NULL,
    matched_against_issue_id = NULL,
    match_reason = '{}'
  WHERE id = p_complaint_id;
END;
$$;