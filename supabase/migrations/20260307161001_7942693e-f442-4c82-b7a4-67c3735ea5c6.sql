
-- Add admin role guard to merge_complaints
CREATE OR REPLACE FUNCTION public.merge_complaints(p_master_id uuid, p_duplicate_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Insufficient privileges: admin role required';
  END IF;

  UPDATE public.complaints
  SET 
    is_duplicate = true,
    master_issue_id = p_master_id,
    duplicate_type = COALESCE(duplicate_type, 'similar')
  WHERE id = ANY(p_duplicate_ids)
    AND id != p_master_id;
END;
$$;

-- Add admin role guard to unmerge_complaint
CREATE OR REPLACE FUNCTION public.unmerge_complaint(p_complaint_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Insufficient privileges: admin role required';
  END IF;

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

-- Add role guard to get_linked_complaints (admin or engineer only)
CREATE OR REPLACE FUNCTION public.get_linked_complaints(p_master_id uuid)
 RETURNS SETOF complaints
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'engineer')) THEN
    RAISE EXCEPTION 'Insufficient privileges: admin or engineer role required';
  END IF;

  RETURN QUERY
  SELECT * FROM public.complaints
  WHERE master_issue_id = p_master_id OR id = p_master_id
  ORDER BY created_at ASC;
END;
$$;
