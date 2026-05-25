import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, AlertTriangle, CheckCircle2, Play } from 'lucide-react';
import { Complaint } from '@/hooks/useComplaints';
import { formatDistanceToNow } from 'date-fns';
import { SignedImage } from '@/components/SignedImage';

interface TaskCardProps {
  complaint: Complaint;
  onResolve: (complaint: Complaint) => void;
  onViewDetails: (complaint: Complaint) => void;
}

const urgencyColors = {
  low: 'bg-green-500/10 text-green-600 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  high: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const statusColors = {
  pending: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  in_progress: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-600 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const statusLabels = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  rejected: 'Rejected',
};

export function TaskCard({ complaint, onResolve, onViewDetails }: TaskCardProps) {
  const isResolvable = complaint.status === 'in_progress';
  const timeAgo = formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true });

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewDetails(complaint)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{complaint.category}</h3>
            {complaint.sub_category && (
              <p className="text-sm text-muted-foreground truncate">{complaint.sub_category}</p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {complaint.urgency && (
              <Badge variant="outline" className={urgencyColors[complaint.urgency]}>
                {complaint.urgency === 'high' && <AlertTriangle className="w-3 h-3 mr-1" />}
                {complaint.urgency.charAt(0).toUpperCase() + complaint.urgency.slice(1)}
              </Badge>
            )}
            <Badge variant="outline" className={statusColors[complaint.status]}>
              {statusLabels[complaint.status]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{complaint.description}</p>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span className="truncate max-w-[150px]">{complaint.address || 'Location captured'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{timeAgo}</span>
          </div>
        </div>

        {complaint.image_url && (
          <SignedImage 
            url={complaint.image_url}
            alt="Complaint"
            className="w-full h-full object-cover"
            containerClassName="relative h-32 rounded-md overflow-hidden"
          />
        )}

        {complaint.status === 'completed' && (
          <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-md">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-600 font-medium">
              Resolved {complaint.resolved_at && formatDistanceToNow(new Date(complaint.resolved_at), { addSuffix: true })}
            </span>
            {complaint.location_mismatch && (
              <Badge variant="outline" className="ml-auto bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                Location Mismatch
              </Badge>
            )}
          </div>
        )}

        {isResolvable && (
          <Button 
            className="w-full" 
            onClick={(e) => {
              e.stopPropagation();
              onResolve(complaint);
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            Start Resolution
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
