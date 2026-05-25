-- Add proof stage, approval workflow, and user visibility columns to work_order_updates
ALTER TABLE public.work_order_updates
ADD COLUMN IF NOT EXISTS proof_stage text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS review_note text,
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS reviewed_by uuid,
ADD COLUMN IF NOT EXISTS citizen_user_id uuid;

-- Add constraints using DO block for safety
DO $$ BEGIN
  BEGIN
    ALTER TABLE public.work_order_updates 
    ADD CONSTRAINT work_order_updates_proof_stage_check 
    CHECK (proof_stage IN ('before', 'wip', 'after', 'general'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.work_order_updates 
    ADD CONSTRAINT work_order_updates_approval_status_check 
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Add index for fast lookup of pending reviews
CREATE INDEX IF NOT EXISTS idx_work_order_updates_approval_status 
ON public.work_order_updates (approval_status);

-- Add index for citizen visibility lookup
CREATE INDEX IF NOT EXISTS idx_work_order_updates_citizen 
ON public.work_order_updates (citizen_user_id, approval_status);

-- Drop policies if exist and recreate
DROP POLICY IF EXISTS "Admins can review engineer updates" ON public.work_order_updates;
CREATE POLICY "Admins can review engineer updates"
ON public.work_order_updates 
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Citizens can view approved updates for their complaints" ON public.work_order_updates;
CREATE POLICY "Citizens can view approved updates for their complaints"
ON public.work_order_updates 
FOR SELECT
USING (
  citizen_user_id = auth.uid() 
  AND approval_status = 'approved'
);

DROP POLICY IF EXISTS "Admins can view all updates" ON public.work_order_updates;
CREATE POLICY "Admins can view all updates"
ON public.work_order_updates 
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));