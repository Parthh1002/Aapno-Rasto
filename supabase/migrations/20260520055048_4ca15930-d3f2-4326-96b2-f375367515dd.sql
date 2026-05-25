CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _requested_role text;
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO UPDATE
  SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  _requested_role := lower(COALESCE(NEW.raw_user_meta_data->>'role', 'citizen'));

  IF _requested_role = 'engineer' THEN
    _role := 'engineer'::public.app_role;
  ELSE
    _role := 'citizen'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();