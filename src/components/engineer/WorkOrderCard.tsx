import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  PlayCircle, 
  PauseCircle,
  MapPin,
  Users,
  Package,
  Wrench
} from 'lucide-react';
import { WorkOrder, VerificationQueueItem } from '@/hooks/useWorkOrders';
import { formatDistanceToNow, differenceInDays, format } from 'date-fns';

interface WorkOrderCardProps {
  workOrder: WorkOrder & { complaint: VerificationQueueItem };
  onStartWork: (workOrder: WorkOrder) => void;
  onViewDetails: (workOrder: WorkOrder) => void;
  onUpdateStatus: (workOrder: WorkOrder) => void;
}

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: Clock },
  pending_approval: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800', icon: PlayCircle },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-800', icon: PauseCircle },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: Clock },
};

export function WorkOrderCard({ workOrder, onStartWork, onViewDetails, onUpdateStatus }: WorkOrderCardProps) {
  const config = statusConfig[workOrder.status];
  const StatusIcon = config.icon;
  
  // Calculate SLA status
  const slaDeadline = workOrder.sla_deadline ? new Date(workOrder.sla_deadline) : null;
  const daysUntilSla = slaDeadline ? differenceInDays(slaDeadline, new Date()) : null;
  const isSlaNearBreach = daysUntilSla !== null && daysUntilSla <= 2 && daysUntilSla >= 0;
  const isSlaBreached = workOrder.sla_breached || (daysUntilSla !== null && daysUntilSla < 0);

  // Calculate task progress
  const completedTasks = workOrder.task_breakdown.filter(t => t.completed).length;
  const totalTasks = workOrder.task_breakdown.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <Card className={`hover:shadow-lg transition-shadow ${isSlaBreached ? 'border-red-500 border-2' : isSlaNearBreach ? 'border-yellow-500 border-2' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold line-clamp-1">
              {workOrder.complaint.category}
            </CardTitle>
            {workOrder.complaint.sub_category && (
              <p className="text-sm text-muted-foreground">{workOrder.complaint.sub_category}</p>
            )}
          </div>
          <Badge className={config.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Work Order ID */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">WO-{workOrder.id.slice(0, 8)}</span>
          <span>•</span>
          <span>Created {formatDistanceToNow(new Date(workOrder.created_at), { addSuffix: true })}</span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span className="line-clamp-1">
            {workOrder.complaint.address || `${workOrder.complaint.lat.toFixed(4)}, ${workOrder.complaint.lng.toFixed(4)}`}
          </span>
        </div>

        {/* Task Progress */}
        {totalTasks > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>Task Progress</span>
              <span>{completedTasks}/{totalTasks} tasks</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Resource Summary */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {workOrder.materials_required.length > 0 && (
            <div className="flex items-center gap-1">
              <Package className="w-4 h-4" />
              <span>{workOrder.materials_required.length}</span>
            </div>
          )}
          {workOrder.tools_required.length > 0 && (
            <div className="flex items-center gap-1">
              <Wrench className="w-4 h-4" />
              <span>{workOrder.tools_required.length}</span>
            </div>
          )}
          {workOrder.assigned_crew.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{workOrder.assigned_crew.length}</span>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="flex items-center gap-4 text-sm">
          {workOrder.start_date && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Start: {format(new Date(workOrder.start_date), 'MMM d')}</span>
            </div>
          )}
          {workOrder.expected_completion_date && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Due: {format(new Date(workOrder.expected_completion_date), 'MMM d')}</span>
            </div>
          )}
        </div>

        {/* SLA Warning */}
        {(isSlaBreached || isSlaNearBreach) && (
          <div className={`flex items-center gap-2 text-sm ${isSlaBreached ? 'text-red-600' : 'text-yellow-600'}`}>
            <AlertTriangle className="w-4 h-4" />
            <span>
              {isSlaBreached 
                ? 'SLA BREACHED' 
                : `SLA breach in ${daysUntilSla} day${daysUntilSla !== 1 ? 's' : ''}`
              }
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails(workOrder)}
          >
            View Details
          </Button>
          {workOrder.status === 'approved' && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onStartWork(workOrder)}
            >
              Start Work
            </Button>
          )}
          {workOrder.status === 'in_progress' && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onUpdateStatus(workOrder)}
            >
              Update Status
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
