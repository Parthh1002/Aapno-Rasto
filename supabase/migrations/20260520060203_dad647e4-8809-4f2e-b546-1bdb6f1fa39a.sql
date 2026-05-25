CREATE OR REPLACE FUNCTION public.complete_user_registration(
  _full_name text DEFAULT NULL,
  _role text DEFAULT 'citizen'
)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _safe_role public.app_role;
  _existing_role public.app_role;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to complete registration';
  END IF;

  SELECT role
  INTO _existing_role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'engineer' THEN 2 ELSE 3 END
  LIMIT 1;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    _user_id,
    COALESCE(NULLIF(trim(_full_name), ''), split_part(COALESCE(auth.email(), ''), '@', 1), 'User')
  )
  ON CONFLICT (user_id) DO UPDATE
  SET full_name = COALESCE(NULLIF(trim(EXCLUDED.full_name), ''), public.profiles.full_name);

  IF _existing_role IS NOT NULL THEN
    RETURN _existing_role;
  END IF;

  IF lower(COALESCE(_role, 'citizen')) = 'engineer' THEN
    _safe_role := 'engineer'::public.app_role;
  ELSE
    _safe_role := 'citizen'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _safe_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _safe_role;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_user_registration(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_user_registration(text, text) TO authenticated;