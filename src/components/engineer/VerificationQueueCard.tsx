import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, AlertTriangle, CheckCircle, Building2 } from 'lucide-react';
import { VerificationQueueItem } from '@/hooks/useWorkOrders';
import { formatDistanceToNow } from 'date-fns';
import { SignedImage } from '@/components/SignedImage';

interface VerificationQueueCardProps {
  complaint: VerificationQueueItem;
  onVerify: (complaint: VerificationQueueItem) => void;
  onViewDetails: (complaint: VerificationQueueItem) => void;
}

const riskColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const urgencyColors = {
  low: 'border-green-500',
  medium: 'border-yellow-500',
  high: 'border-red-500',
};

export function VerificationQueueCard({ complaint, onVerify, onViewDetails }: VerificationQueueCardProps) {
  const riskScore = (complaint.ai_risk_score || 'medium') as keyof typeof riskColors;
  const urgency = (complaint.urgency || 'medium') as keyof typeof urgencyColors;

  return (
    <Card className={`border-l-4 ${urgencyColors[urgency]} hover:shadow-lg transition-shadow`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold line-clamp-1">
              {complaint.category}
            </CardTitle>
            {complaint.sub_category && (
              <p className="text-sm text-muted-foreground">{complaint.sub_category}</p>
            )}
          </div>
          <Badge className={riskColors[riskScore]}>
            {riskScore.toUpperCase()} RISK
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Issue ID */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">#{complaint.id.slice(0, 8)}</span>
          <span>•</span>
          <Clock className="w-3 h-3" />
          <span>{formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}</span>
        </div>

        {/* Description */}
        <p className="text-sm line-clamp-2">{complaint.description}</p>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span className="line-clamp-1">
            {complaint.address && complaint.address !== 'Current Location' 
              ? complaint.address 
              : `${complaint.lat.toFixed(4)}°N, ${complaint.lng.toFixed(4)}°E`}
          </span>
        </div>

        {/* Department */}
        {complaint.department && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span>{complaint.department}</span>
          </div>
        )}

        {/* Priority */}
        <div className="flex items-center gap-2">
          {complaint.priority_rank > 5 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Priority #{complaint.priority_rank}
            </Badge>
          )}
          {complaint.ai_verified && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              AI Verified
            </Badge>
          )}
        </div>

        {/* Image Preview */}
        {complaint.image_url && (
          <SignedImage 
            url={complaint.image_url} 
            alt="Complaint" 
            className="w-full h-full object-cover"
            containerClassName="relative h-32 rounded-md overflow-hidden bg-muted"
          />
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails(complaint)}
          >
            View Details
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onVerify(complaint)}
          >
            Verify & Create Work Order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
