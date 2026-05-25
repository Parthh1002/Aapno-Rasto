import { motion } from 'framer-motion';
import { useApprovedUpdates, ProofStage } from '@/hooks/useEngineerUpdates';
import { SignedImage } from '@/components/SignedImage';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Camera, 
  Clock, 
  MapPin, 
  CheckCircle2,
  Wrench,
  ClipboardCheck
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const proofStageConfig: Record<ProofStage, { label: string; icon: typeof Camera; color: string }> = {
  before: { label: 'Before Repair', icon: Camera, color: 'bg-blue-500' },
  wip: { label: 'Work In Progress', icon: Wrench, color: 'bg-yellow-500' },
  after: { label: 'Completed', icon: CheckCircle2, color: 'bg-green-500' },
  general: { label: 'Update', icon: ClipboardCheck, color: 'bg-gray-500' },
};

interface WorkProgressUpdatesProps {
  complaintId: string;
}

export function WorkProgressUpdates({ complaintId }: WorkProgressUpdatesProps) {
  const { data: updates = [], isLoading } = useApprovedUpdates(complaintId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No work updates yet</p>
        <p className="text-xs">Updates will appear here when the engineer starts work</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Wrench className="w-4 h-4" />
        Work Progress ({updates.length} updates)
      </h4>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
        
        <div className="space-y-4">
          {updates.map((update, index) => {
            const stageConfig = proofStageConfig[update.proof_stage as ProofStage] || proofStageConfig.general;
            const StageIcon = stageConfig.icon;
            
            return (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-10"
              >
                {/* Timeline dot */}
                <div className={`absolute left-2 top-2 w-5 h-5 rounded-full ${stageConfig.color} flex items-center justify-center`}>
                  <StageIcon className="w-3 h-3 text-white" />
                </div>
                
                <Card className="overflow-hidden">
                  <CardContent className="p-3 space-y-2">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {stageConfig.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    {/* Image */}
                    {update.image_url && (
                      <SignedImage 
                        url={update.image_url} 
                        alt={stageConfig.label} 
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    )}
                    
                    {/* Message */}
                    {update.message && (
                      <p className="text-sm text-muted-foreground">{update.message}</p>
                    )}
                    
                    {/* GPS Info */}
                    {update.gps_lat && update.gps_lng && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>Location verified</span>
                        {update.gps_verified && (
                          <CheckCircle2 className="w-3 h-3 text-green-500 ml-1" />
                        )}
                      </div>
                    )}
                    
                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(update.created_at), 'PPp')}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
