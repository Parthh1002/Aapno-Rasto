import { useState } from 'react';
import { motion } from 'framer-motion';
import { SignedImage } from '@/components/SignedImage';
import { 
  usePendingReviews, 
  useReviewUpdate, 
  EngineerUpdateWithComplaint,
  ProofStage
} from '@/hooks/useEngineerUpdates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MapPin, 
  Camera,
  AlertTriangle,
  Image,
  ClipboardList,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const proofStageLabels: Record<ProofStage, { label: string; color: string }> = {
  before: { label: 'Before Repair', color: 'bg-blue-500' },
  wip: { label: 'Work-In-Progress', color: 'bg-yellow-500' },
  after: { label: 'After Repair', color: 'bg-green-500' },
  general: { label: 'General Update', color: 'bg-gray-500' },
};

interface ReviewModalProps {
  update: EngineerUpdateWithComplaint;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: (action: 'approve' | 'reject', note: string) => Promise<void>;
  isSubmitting: boolean;
}

function ReviewModal({ update, open, onOpenChange, onReview, isSubmitting }: ReviewModalProps) {
  const [reviewNote, setReviewNote] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleSubmit = async (selectedAction: 'approve' | 'reject') => {
    setAction(selectedAction);
    await onReview(selectedAction, reviewNote);
    setReviewNote('');
    setAction(null);
  };

  const stageInfo = proofStageLabels[update.proof_stage as ProofStage] || proofStageLabels.general;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Review Engineer Update
          </DialogTitle>
          <DialogDescription>
            {update.work_order?.complaint?.category} - {update.work_order?.complaint?.description?.slice(0, 50)}...
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Update Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Proof Stage</Label>
                <Badge className={`${stageInfo.color} text-white mt-1`}>
                  {stageInfo.label}
                </Badge>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Status</Label>
                <p className="font-medium capitalize mt-1">{update.status.replace('_', ' ')}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Update Type</Label>
                <p className="font-medium capitalize mt-1">{update.update_type?.replace('_', ' ') || 'General'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Submitted</Label>
                <p className="font-medium mt-1">{formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}</p>
              </div>
            </div>

            {/* Engineer Notes */}
            {update.message && (
              <div>
                <Label className="text-muted-foreground text-xs">Engineer Notes</Label>
                <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{update.message}</p>
              </div>
            )}

            {/* Photo Evidence */}
            {update.image_url && (
              <div>
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  Photo Evidence
                </Label>
                <div className="mt-2 relative">
                  <SignedImage 
                    url={update.image_url} 
                    alt="Proof" 
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* GPS Verification */}
            {update.gps_lat && update.gps_lng && (
              <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">GPS Location</p>
                  <p className="text-xs text-muted-foreground">
                    {update.gps_lat.toFixed(6)}, {update.gps_lng.toFixed(6)}
                  </p>
                </div>
                {update.gps_distance_meters && (
                  <div className={`text-sm ${update.gps_verified ? 'text-green-600' : 'text-destructive'}`}>
                    {update.gps_verified ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        {Math.round(update.gps_distance_meters)}m
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        {Math.round(update.gps_distance_meters)}m (mismatch)
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Complaint Original Image for comparison */}
            {update.work_order?.complaint?.image_url && (
              <div>
                <Label className="text-muted-foreground text-xs flex items-center gap-1">
                  <Image className="w-3 h-3" />
                  Original Complaint Photo
                </Label>
                <SignedImage 
                  url={update.work_order.complaint.image_url} 
                  alt="Original complaint" 
                  className="mt-2 w-full h-48 object-cover rounded-lg opacity-80"
                />
              </div>
            )}

            {/* Review Note */}
            <div>
              <Label htmlFor="review-note">Review Note (optional)</Label>
              <Textarea
                id="review-note"
                placeholder="Add any notes about this review..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t mt-4">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => handleSubmit('reject')}
            disabled={isSubmitting}
          >
            {isSubmitting && action === 'reject' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            Reject
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => handleSubmit('approve')}
            disabled={isSubmitting}
          >
            {isSubmitting && action === 'approve' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Approve
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EngineerUpdateReview() {
  const { data: pendingUpdates = [], isLoading } = usePendingReviews();
  const reviewMutation = useReviewUpdate();
  const { toast } = useToast();
  const [selectedUpdate, setSelectedUpdate] = useState<EngineerUpdateWithComplaint | null>(null);

  const handleReview = async (action: 'approve' | 'reject', note: string) => {
    if (!selectedUpdate) return;

    try {
      await reviewMutation.mutateAsync({
        update_id: selectedUpdate.id,
        action,
        review_note: note || undefined,
        work_order_id: selectedUpdate.work_order_id,
      });

      toast({
        title: action === 'approve' ? 'Update Approved' : 'Update Rejected',
        description: action === 'approve' 
          ? 'The update is now visible to the citizen.' 
          : 'The engineer has been notified.',
      });

      setSelectedUpdate(null);
    } catch (error) {
      console.error('Review error:', error);
      toast({
        title: 'Error',
        description: 'Failed to process review. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pendingUpdates.length === 0) {
    return (
      <Card className="govt-card py-12 border-l-4 border-l-govt-green bg-gradient-to-br from-background to-govt-green/5">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <CheckCircle2 className="w-16 h-16 text-govt-green mb-4" />
          <h3 className="text-lg font-semibold text-govt-green">All Clear!</h3>
          <p className="text-muted-foreground mt-2">No updates pending review at the moment.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pending Reviews</h2>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {pendingUpdates.length} pending
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingUpdates.map((update, index) => {
          const stageInfo = proofStageLabels[update.proof_stage as ProofStage] || proofStageLabels.general;
          
          return (
            <motion.div
              key={update.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="govt-card cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group"
                onClick={() => setSelectedUpdate(update)}
              >
                <CardHeader className="pb-2 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <Badge className={`${stageInfo.color} text-white`}>
                      {stageInfo.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <CardTitle className="text-sm mt-2">
                    {update.work_order?.complaint?.category || 'Unknown Category'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {update.image_url && (
                    <SignedImage 
                      url={update.image_url} 
                      alt="Proof" 
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {update.message || 'No notes provided'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span className="capitalize">{update.status.replace('_', ' ')}</span>
                    {update.gps_verified === false && update.gps_distance_meters && (
                      <Badge variant="destructive" className="ml-auto text-xs">
                        GPS Mismatch
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {selectedUpdate && (
        <ReviewModal
          update={selectedUpdate}
          open={!!selectedUpdate}
          onOpenChange={(open) => !open && setSelectedUpdate(null)}
          onReview={handleReview}
          isSubmitting={reviewMutation.isPending}
        />
      )}
    </div>
  );
}
