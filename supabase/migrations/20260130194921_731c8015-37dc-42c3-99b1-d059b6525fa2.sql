-- Add new fields to complaints table for AI verification and priority
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS ai_risk_score TEXT CHECK (ai_risk_score IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS ai_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS priority_rank INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS verified_by_engineer UUID,
ADD COLUMN IF NOT EXISTS engineer_verified_at TIMESTAMPTZ;

-- Create work_orders table
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  engineer_id UUID NOT NULL,
  
  -- Task breakdown (stored as JSONB array)
  task_breakdown JSONB DEFAULT '[]'::jsonb,
  
  -- Resource planning
  materials_required JSONB DEFAULT '[]'::jsonb,
  tools_required JSONB DEFAULT '[]'::jsonb,
  assigned_crew JSONB DEFAULT '[]'::jsonb,
  
  -- Duration estimates
  estimated_duration_hours DECIMAL(6,2),
  actual_duration_hours DECIMAL(6,2),
  
  -- SLA & Timeline
  start_date TIMESTAMPTZ,
  expected_completion_date TIMESTAMPTZ,
  actual_completion_date TIMESTAMPTZ,
  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  
  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'in_progress', 'blocked', 'completed', 'cancelled')),
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(complaint_id)
);

-- Create safety_checklists table
CREATE TABLE public.safety_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  
  -- Checklist items stored as JSONB with structure:
  -- [{ "id": "uuid", "item": "string", "required": boolean, "checked": boolean, "checked_at": timestamp }]
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Completion tracking
  all_required_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(work_order_id)
);

-- Create safety_checklist_templates table (templates per issue type)
CREATE TABLE public.safety_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  sub_category TEXT,
  
  -- Template items
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Example: [{ "item": "Barricades installed", "required": true }, ...]
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(category, sub_category)
);

-- Create work_order_updates table for live field updates
CREATE TABLE public.work_order_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  engineer_id UUID NOT NULL,
  
  -- Status update
  status TEXT NOT NULL CHECK (status IN ('started', 'in_progress', 'blocked', 'resumed', 'completed')),
  
  -- Message/notes
  message TEXT,
  update_type TEXT DEFAULT 'status' CHECK (update_type IN ('status', 'clarification', 'delay_reason', 'escalation', 'general')),
  
  -- Image with GPS verification
  image_url TEXT,
  gps_lat DECIMAL(10, 7),
  gps_lng DECIMAL(10, 7),
  gps_verified BOOLEAN DEFAULT false,
  gps_distance_meters DECIMAL(10, 2),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create quality_verifications table for handover
CREATE TABLE public.quality_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  
  -- Final proof
  final_image_url TEXT NOT NULL,
  final_video_url TEXT,
  
  -- GPS verification
  gps_lat DECIMAL(10, 7) NOT NULL,
  gps_lng DECIMAL(10, 7) NOT NULL,
  gps_verified BOOLEAN DEFAULT false,
  gps_distance_meters DECIMAL(10, 2),
  
  -- AI comparison (before/after)
  ai_comparison_score DECIMAL(5, 2),
  ai_comparison_notes TEXT,
  
  -- Authority verification
  submitted_at TIMESTAMPTZ DEFAULT now(),
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  verification_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(work_order_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_orders
CREATE POLICY "Engineers can view their own work orders"
ON public.work_orders FOR SELECT
TO authenticated
USING (
  engineer_id = auth.uid() 
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Engineers can insert their own work orders"
ON public.work_orders FOR INSERT
TO authenticated
WITH CHECK (
  engineer_id = auth.uid() 
  AND has_role(auth.uid(), 'engineer')
);

CREATE POLICY "Engineers can update their own work orders"
ON public.work_orders FOR UPDATE
TO authenticated
USING (engineer_id = auth.uid() AND has_role(auth.uid(), 'engineer'))
WITH CHECK (engineer_id = auth.uid() AND has_role(auth.uid(), 'engineer'));

CREATE POLICY "Admins can manage all work orders"
ON public.work_orders FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for safety_checklists
CREATE POLICY "Engineers can view their work order checklists"
ON public.safety_checklists FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders wo 
    WHERE wo.id = work_order_id 
    AND (wo.engineer_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Engineers can insert checklists for their work orders"
ON public.safety_checklists FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_orders wo 
    WHERE wo.id = work_order_id 
    AND wo.engineer_id = auth.uid()
    AND has_role(auth.uid(), 'engineer')
  )
);

CREATE POLICY "Engineers can update their work order checklists"
ON public.safety_checklists FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders wo 
    WHERE wo.id = work_order_id 
    AND wo.engineer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_orders wo 
    WHERE wo.id = work_order_id 
    AND wo.engineer_id = auth.uid()
  )
);

-- RLS Policies for safety_checklist_templates (read-only for engineers, full for admins)
CREATE POLICY "Everyone can view active templates"
ON public.safety_checklist_templates FOR SELECT
TO authenticated
USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage templates"
ON public.safety_checklist_templates FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for work_order_updates
CREATE POLICY "Engineers can view updates for their work orders"
ON public.work_order_updates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders wo 
    WHERE wo.id = work_order_id 
    AND (wo.engineer_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Engineers can insert updates for their work orders"
ON public.work_order_updates FOR INSERT
TO authenticated
WITH CHECK (
  engineer_id = auth.uid()
  AND has_role(auth.uid(), 'engineer')
  AND EXISTS (
    SELECT 1 FROM public.work_orders wo 
    WHERE wo.id = work_order_id 
    AND wo.engineer_id = auth.uid()
  )
);

-- RLS Policies for quality_verifications
CREATE POLICY "Engineers can view their quality verifications"
ON public.quality_verifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.work_orders wo 
    WHERE wo.id = work_order_id 
    AND (wo.engineer_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Engineers can submit quality verifications"
ON public.quality_verifications FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.work_orders wo 
    WHERE wo.id = work_order_id 
    AND wo.engineer_id = auth.uid()
    AND has_role(auth.uid(), 'engineer')
  )
);

CREATE POLICY "Admins can update quality verifications"
ON public.quality_verifications FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_work_orders_updated_at
BEFORE UPDATE ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_safety_checklists_updated_at
BEFORE UPDATE ON public.safety_checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_safety_checklist_templates_updated_at
BEFORE UPDATE ON public.safety_checklist_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quality_verifications_updated_at
BEFORE UPDATE ON public.quality_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_order_updates;

-- Insert default safety checklist templates
INSERT INTO public.safety_checklist_templates (category, sub_category, items) VALUES
('Road & Infrastructure', 'Pothole', '[
  {"item": "Traffic cones/barricades installed", "required": true},
  {"item": "Warning signage placed", "required": true},
  {"item": "PPE (helmet, vest, gloves) worn", "required": true},
  {"item": "Traffic diversion applied if needed", "required": false},
  {"item": "Night reflectors placed (if applicable)", "required": false}
]'::jsonb),
('Road & Infrastructure', 'Street Light', '[
  {"item": "Power supply isolated", "required": true},
  {"item": "Safety harness for height work", "required": true},
  {"item": "PPE (helmet, gloves, safety glasses) worn", "required": true},
  {"item": "Warning signage placed", "required": true},
  {"item": "Ladder/lift equipment inspected", "required": true}
]'::jsonb),
('Sanitation', 'Garbage', '[
  {"item": "PPE (gloves, mask) worn", "required": true},
  {"item": "Waste collection vehicle ready", "required": true},
  {"item": "Area cordoned off if needed", "required": false}
]'::jsonb),
('Water Supply', 'Leakage', '[
  {"item": "Water supply isolated", "required": true},
  {"item": "Excavation barricades installed", "required": true},
  {"item": "PPE worn", "required": true},
  {"item": "Drainage arranged", "required": true}
]'::jsonb),
('Drainage', 'Blocked Drain', '[
  {"item": "PPE (gloves, mask, boots) worn", "required": true},
  {"item": "Area barricaded", "required": true},
  {"item": "Ventilation equipment ready", "required": true},
  {"item": "Warning signage placed", "required": true}
]'::jsonb);