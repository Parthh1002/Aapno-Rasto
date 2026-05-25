-- Add resolution_photos column to store array of photo URLs
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS resolution_photos TEXT[] DEFAULT '{}';

-- Enable realtime for complaints table
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;