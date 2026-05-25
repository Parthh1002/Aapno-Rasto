export interface Complaint {
  id: string;
  user_id: string;
  category: string;
  sub_category: string | null;
  description: string;
  lat: number;
  lng: number;
  address: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  urgency: 'low' | 'medium' | 'high' | null;
  image_url: string;
  assigned_to: string | null;
  resolution_image_url: string | null;
  resolution_notes: string | null;
  resolution_lat: number | null;
  resolution_lng: number | null;
  resolution_photos: string[] | null;
  location_mismatch: boolean;
  points_awarded: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  
  // Appended AI verification fields from VerificationQueueItem
  ai_risk_score?: string | null;
  ai_verified?: boolean;
  department?: string | null;
  priority_rank?: number;
  verified_by_engineer?: string | null;
  engineer_verified_at?: string | null;
}

export interface TaskBreakdownItem {
  id: string;
  task: string;
  estimated_hours: number;
  completed: boolean;
}

export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  available: boolean;
}

export interface ToolItem {
  id: string;
  name: string;
  quantity: number;
  available: boolean;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  available: boolean;
}

export interface WorkOrder {
  id: string;
  complaint_id: string;
  engineer_id: string;
  task_breakdown: TaskBreakdownItem[];
  materials_required: MaterialItem[];
  tools_required: ToolItem[];
  assigned_crew: CrewMember[];
  estimated_duration_hours: number | null;
  actual_duration_hours: number | null;
  start_date: string | null;
  expected_completion_date: string | null;
  actual_completion_date: string | null;
  sla_deadline: string | null;
  sla_breached: boolean;
  status: 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  complaint?: Complaint; // populated via join
}

export interface SafetyChecklistItem {
  item: string;
  required: boolean;
  checked?: boolean;
  checked_at?: string;
}

export interface SafetyChecklist {
  id: string;
  work_order_id: string;
  checklist_items: SafetyChecklistItem[];
  all_required_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
}

export interface WorkOrderUpdate {
  id: string;
  work_order_id: string;
  engineer_id: string;
  status: 'started' | 'in_progress' | 'blocked' | 'resumed' | 'completed';
  message: string | null;
  update_type: 'status' | 'clarification' | 'delay_reason' | 'escalation' | 'general';
  image_url: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_verified: boolean;
  gps_distance_meters: number | null;
  created_at: string;
}
