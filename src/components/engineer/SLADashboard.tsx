import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  TrendingUp,
  Calendar,
  Timer,
  AlertCircle
} from 'lucide-react';
import { WorkOrder, VerificationQueueItem } from '@/hooks/useWorkOrders';
import { differenceInDays, differenceInHours, format, formatDistanceToNow, isAfter, isBefore, startOfDay, addDays } from 'date-fns';

interface SLADashboardProps {
  workOrders: (WorkOrder & { complaint: VerificationQueueItem })[];
  isLoading?: boolean;
}

interface SLAMetrics {
  total: number;
  onTrack: number;
  atRisk: number;
  breached: number;
  completed: number;
  avgCompletionRate: number;
}

interface TimelineItem {
  workOrder: WorkOrder & { complaint: VerificationQueueItem };
  daysRemaining: number;
  percentageUsed: number;
  status: 'on_track' | 'at_risk' | 'breached' | 'completed';
}

export function SLADashboard({ workOrders, isLoading }: SLADashboardProps) {
  const metrics = useMemo((): SLAMetrics => {
    const now = new Date();
    let onTrack = 0;
    let atRisk = 0;
    let breached = 0;
    let completed = 0;
    let totalDuration = 0;
    let completedWithDuration = 0;

    workOrders.forEach(wo => {
      if (wo.status === 'completed') {
        completed++;
        if (wo.start_date && wo.actual_completion_date) {
          const duration = differenceInHours(new Date(wo.actual_completion_date), new Date(wo.start_date));
          totalDuration += duration;
          completedWithDuration++;
        }
        return;
      }

      if (wo.sla_breached) {
        breached++;
        return;
      }

      if (wo.sla_deadline) {
        const deadline = new Date(wo.sla_deadline);
        const daysUntil = differenceInDays(deadline, now);
        
        if (daysUntil < 0) {
          breached++;
        } else if (daysUntil <= 2) {
          atRisk++;
        } else {
          onTrack++;
        }
      } else {
        onTrack++;
      }
    });

    return {
      total: workOrders.length,
      onTrack,
      atRisk,
      breached,
      completed,
      avgCompletionRate: completedWithDuration > 0 ? Math.round(totalDuration / completedWithDuration) : 0,
    };
  }, [workOrders]);

  const timelineItems = useMemo((): TimelineItem[] => {
    const now = new Date();
    
    return workOrders
      .filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled')
      .map(wo => {
        const createdAt = new Date(wo.created_at);
        const deadline = wo.sla_deadline ? new Date(wo.sla_deadline) : addDays(createdAt, 7);
        const totalDuration = differenceInHours(deadline, createdAt);
        const elapsed = differenceInHours(now, createdAt);
        const percentageUsed = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        const daysRemaining = differenceInDays(deadline, now);

        let status: TimelineItem['status'] = 'on_track';
        if (wo.sla_breached || daysRemaining < 0) {
          status = 'breached';
        } else if (daysRemaining <= 2) {
          status = 'at_risk';
        }

        return {
          workOrder: wo,
          daysRemaining,
          percentageUsed,
          status,
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [workOrders]);

  const breachedItems = timelineItems.filter(item => item.status === 'breached');
  const atRiskItems = timelineItems.filter(item => item.status === 'at_risk');

  const getStatusColor = (status: TimelineItem['status']) => {
    switch (status) {
      case 'breached': return 'text-destructive';
      case 'at_risk': return 'text-yellow-600';
      case 'on_track': return 'text-green-600';
      case 'completed': return 'text-muted-foreground';
    }
  };

  const getProgressColor = (status: TimelineItem['status']) => {
    switch (status) {
      case 'breached': return 'bg-destructive';
      case 'at_risk': return 'bg-yellow-500';
      case 'on_track': return 'bg-green-500';
      case 'completed': return 'bg-muted';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breach Alerts */}
      {(breachedItems.length > 0 || atRiskItems.length > 0) && (
        <div className="space-y-3">
          {breachedItems.length > 0 && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="py-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-destructive">SLA Breached ({breachedItems.length})</h4>
                    <p className="text-sm text-muted-foreground">
                      {breachedItems.map(item => item.workOrder.complaint?.category).join(', ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {atRiskItems.length > 0 && (
            <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
              <CardContent className="py-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-700 dark:text-yellow-500">At Risk ({atRiskItems.length})</h4>
                    <p className="text-sm text-muted-foreground">
                      Work orders nearing deadline within 48 hours
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-muted">
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.total}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{metrics.onTrack}</p>
                <p className="text-xs text-muted-foreground">On Track</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{metrics.atRisk}</p>
                <p className="text-xs text-muted-foreground">At Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertCircle className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{metrics.breached}</p>
                <p className="text-xs text-muted-foreground">Breached</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{metrics.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Compliance Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">SLA Compliance Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Compliance</span>
              <span className="font-medium">
                {metrics.total > 0 
                  ? Math.round(((metrics.onTrack + metrics.completed) / metrics.total) * 100)
                  : 100}%
              </span>
            </div>
            <Progress 
              value={metrics.total > 0 
                ? ((metrics.onTrack + metrics.completed) / metrics.total) * 100
                : 100
              } 
              className="h-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground pt-1">
              <span>{metrics.onTrack + metrics.completed} compliant</span>
              <span>{metrics.atRisk + metrics.breached} non-compliant</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            SLA Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timelineItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>No active work orders to track</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {timelineItems.map((item) => (
                  <div 
                    key={item.workOrder.id}
                    className={`p-4 rounded-lg border ${
                      item.status === 'breached' 
                        ? 'border-destructive bg-destructive/5' 
                        : item.status === 'at_risk' 
                          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10' 
                          : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{item.workOrder.complaint?.category}</h4>
                          <Badge 
                            variant="outline" 
                            className={getStatusColor(item.status)}
                          >
                            {item.status === 'breached' && 'BREACHED'}
                            {item.status === 'at_risk' && 'AT RISK'}
                            {item.status === 'on_track' && 'On Track'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          WO-{item.workOrder.id.slice(0, 8)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${getStatusColor(item.status)}`}>
                          {item.daysRemaining < 0 
                            ? `${Math.abs(item.daysRemaining)} days overdue`
                            : item.daysRemaining === 0 
                              ? 'Due today'
                              : `${item.daysRemaining} days left`
                          }
                        </p>
                        {item.workOrder.sla_deadline && (
                          <p className="text-xs text-muted-foreground">
                            Deadline: {format(new Date(item.workOrder.sla_deadline), 'MMM d, h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Timeline Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Started {formatDistanceToNow(new Date(item.workOrder.created_at), { addSuffix: true })}
                        </span>
                        <span>{Math.round(item.percentageUsed)}% time used</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${getProgressColor(item.status)}`}
                          style={{ width: `${Math.min(100, item.percentageUsed)}%` }}
                        />
                      </div>
                    </div>

                    {/* Task Progress */}
                    {item.workOrder.task_breakdown.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Task Progress</span>
                          <span>
                            {item.workOrder.task_breakdown.filter(t => t.completed).length}/
                            {item.workOrder.task_breakdown.length} tasks
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
