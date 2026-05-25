-- Create role enum
CREATE TYPE public.app_role AS ENUM ('citizen', 'engineer', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function (security definer to prevent RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create complaints table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT,
  description TEXT NOT NULL,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  address TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high')),
  image_url TEXT NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_image_url TEXT,
  resolution_notes TEXT,
  resolution_lat DECIMAL(10, 7),
  resolution_lng DECIMAL(10, 7),
  location_mismatch BOOLEAN DEFAULT false,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Enable RLS on complaints
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- RLS policies for complaints
CREATE POLICY "Users can view their own complaints"
ON public.complaints FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR assigned_to = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'engineer')
);

CREATE POLICY "Users can insert their own complaints"
ON public.complaints FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update any complaint"
ON public.complaints FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Engineers can update assigned complaints"
ON public.complaints FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid() AND public.has_role(auth.uid(), 'engineer'))
WITH CHECK (assigned_to = auth.uid() AND public.has_role(auth.uid(), 'engineer'));

CREATE POLICY "Users can update their own pending complaints"
ON public.complaints FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can delete complaints"
ON public.complaints FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_complaints_updated_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for complaint images
INSERT INTO storage.buckets (id, name, public) VALUES ('complaints', 'complaints', true);

-- Storage policies for complaints bucket
CREATE POLICY "Anyone can view complaint images"
ON storage.objects FOR SELECT
USING (bucket_id = 'complaints');

CREATE POLICY "Authenticated users can upload complaint images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'complaints');

CREATE POLICY "Users can update their own complaint images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'complaints' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Engineers can upload resolution images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'complaints' AND public.has_role(auth.uid(), 'engineer'));