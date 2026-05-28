import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  PlayCircle, 
  PauseCircle, 
  CheckCircle2, 
  AlertTriangle,
  Camera,
  MapPin,
  MessageSquare,
  AlertCircle,
  ClipboardCheck,
  Clock,
  Upload,
  Loader2,
  Shield,
  ImageIcon
} from 'lucide-react';
import { WorkOrder, Complaint, WorkOrderUpdate } from '@/types/models';
import { useSubmitEngineerUpdate, ProofStage } from '@/hooks/useEngineerUpdates';
import { uploadComplaintImage } from '@/hooks/useComplaints';
import { LiveCameraCapture } from '@/components/LiveCameraCapture';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { applyWatermark, dataUrlToBlob, calculateDistance, WatermarkResult } from '@/utils/imageWatermark';
import { 
  useWorkingStagePhotos, 
  calculateWorkingPhotoStats, 
  useServerValidateWorkingPhotos,
  WORKING_STAGES,
  MAX_WORKING_PHOTOS,
  MIN_WORKING_PHOTOS
} from '@/hooks/useWorkingStagePhotos';

interface FieldUpdateModalProps {
  workOrder: WorkOrder & { complaint: Complaint };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface ImageMetadata {
  timestamp: Date;
  location?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
}

interface SubmissionState {
  step: 'idle' | 'watermarking' | 'uploading' | 'submitting' | 'complete' | 'error';
  progress: number;
  message: string;
}

const statusOptions = [
  { value: 'in_progress', label: 'In Progress', icon: PlayCircle, color: 'text-blue-600' },
  { value: 'blocked', label: 'Blocked', icon: PauseCircle, color: 'text-destructive' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-green-600' },
];

const proofStageOptions: { value: ProofStage; label: string; description: string }[] = [
  { value: 'before', label: 'Before Repair', description: 'Document current state' },
  { value: 'wip', label: 'Work-In-Progress', description: 'Active repair photos' },
  { value: 'after', label: 'After Repair', description: 'Completed work proof' },
  { value: 'general', label: 'General Update', description: 'Status or notes only' },
];

const updateTypeOptions = [
  { value: 'status', label: 'Status Update' },
  { value: 'clarification', label: 'Clarification Request' },
  { value: 'delay_reason', label: 'Delay Reason' },
  { value: 'escalation', label: 'Escalation' },
  { value: 'general', label: 'General Note' },
];

export function FieldUpdateModal({ workOrder, open, onOpenChange, onComplete }: FieldUpdateModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const submitUpdate = useSubmitEngineerUpdate();
  const serverValidate = useServerValidateWorkingPhotos();
  
  // Fetch existing working-stage photos to track count
  const { data: workingPhotos = [], isLoading: loadingPhotos } = useWorkingStagePhotos(workOrder.id);
  const photoStats = useMemo(() => calculateWorkingPhotoStats(workingPhotos), [workingPhotos]);
  
  const [status, setStatus] = useState<WorkOrderUpdate['status']>('in_progress');
  const [updateType, setUpdateType] = useState<WorkOrderUpdate['update_type']>('status');
  const [proofStage, setProofStage] = useState<ProofStage>('general');
  const [message, setMessage] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [watermarkedImage, setWatermarkedImage] = useState<string | null>(null);
  const [watermarkMetadata, setWatermarkMetadata] = useState<WatermarkResult['metadata'] | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    step: 'idle',
    progress: 0,
    message: '',
  });

  // Check if current proof stage is a working stage
  const isWorkingStage = WORKING_STAGES.includes(proofStage);
  
  // Check if capture should be disabled (max reached for working stages)
  const isCaptureDisabled = isWorkingStage && !photoStats.canAddMore;

  // Handle image capture with automatic watermarking
  const handleCapture = async (imageData: string, metadata: ImageMetadata) => {
    // Server-side validation for working stages
    if (isWorkingStage) {
      try {
        const validation = await serverValidate.mutateAsync({
          work_order_id: workOrder.id,
          proof_stage: proofStage,
        });
        
        if (!validation.valid) {
          toast({
            title: 'Photo Limit Reached',
            description: validation.message,
            variant: 'destructive',
          });
          setShowCamera(false);
          return;
        }
      } catch (err) {
        console.error('Validation error:', err);
      }
    }

    setCapturedImage(imageData);
    setShowCamera(false);
    
    if (metadata.location) {
      const location = {
        lat: metadata.location.lat,
        lng: metadata.location.lng,
        accuracy: metadata.location.accuracy,
      };
      setCurrentLocation(location);
      
      // Apply watermark immediately after capture
      try {
        setSubmissionState({ step: 'watermarking', progress: 30, message: 'Applying GPS watermark...' });
        
        const result = await applyWatermark(imageData, {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          timestamp: metadata.timestamp,
          complaintId: workOrder.complaint.id,
          complaintLocation: {
            lat: workOrder.complaint.lat,
            lng: workOrder.complaint.lng,
          },
        });
        
        setWatermarkedImage(result.watermarkedDataUrl);
        setWatermarkMetadata(result.metadata);
        setSubmissionState({ step: 'idle', progress: 0, message: '' });
        
        toast({
          title: result.metadata.isLocationValid ? '✓ Photo Verified' : '⚠️ Location Warning',
          description: result.metadata.isLocationValid 
            ? `GPS watermark applied. ${Math.round(result.metadata.distanceFromComplaint || 0)}m from complaint site.`
            : `You are ${Math.round(result.metadata.distanceFromComplaint || 0)}m away from the complaint site. This will be flagged for review.`,
          variant: result.metadata.isLocationValid ? 'default' : 'destructive',
        });
      } catch (error) {
        console.error('Watermark error:', error);
        toast({
          title: 'Watermark Failed',
          description: 'Could not apply GPS watermark. Please retake photo.',
          variant: 'destructive',
        });
        setCapturedImage(null);
        setSubmissionState({ step: 'idle', progress: 0, message: '' });
      }
    } else {
      // No GPS - show warning
      toast({
        title: 'GPS Required',
        description: 'Location data is required for proof images. Please enable GPS and retake photo.',
        variant: 'destructive',
      });
      setCapturedImage(null);
    }
  };

  const distanceFromComplaint = watermarkMetadata?.distanceFromComplaint ?? 
    (currentLocation 
      ? calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          workOrder.complaint.lat,
          workOrder.complaint.lng
        )
      : null);

  const isLocationMismatch = distanceFromComplaint !== null && distanceFromComplaint > 500;

  // Require photo for proof stages
  const requiresPhoto = proofStage !== 'general';
  const canSubmit = (!requiresPhoto || (capturedImage && watermarkedImage)) && submissionState.step === 'idle';

  const handleSubmit = async () => {
    if (!user?.id) return;
    
    if (requiresPhoto && (!capturedImage || !watermarkedImage)) {
      toast({
        title: 'Photo Required',
        description: `Please capture a GPS-verified photo for ${proofStageOptions.find(p => p.value === proofStage)?.label} proof.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      let imageUrl: string | undefined;

      if (watermarkedImage) {
        // Upload the watermarked image
        setSubmissionState({ step: 'uploading', progress: 50, message: 'Uploading watermarked proof...' });
        
        const blob = dataUrlToBlob(watermarkedImage);
        imageUrl = await uploadComplaintImage(blob, user.id, 'resolution');
        
        setSubmissionState({ step: 'submitting', progress: 80, message: 'Submitting update...' });
      }

      await submitUpdate.mutateAsync({
        work_order_id: workOrder.id,
        citizen_user_id: workOrder.complaint.user_id,
        status,
        message: message || undefined,
        update_type: updateType,
        image_url: imageUrl,
        gps_lat: currentLocation?.lat,
        gps_lng: currentLocation?.lng,
        gps_distance_meters: distanceFromComplaint || undefined,
        proof_stage: proofStage,
      });

      setSubmissionState({ step: 'complete', progress: 100, message: 'Submitted successfully!' });

      // Send resolution email if this is "after" stage completion
      if (proofStage === 'after' && status === 'completed') {
        // In a real Firebase setup, a Cloud Function triggered by Firestore onCreate 
        // would send the email here. We mock it for now.
        console.log('Would send resolution email here via Cloud Functions');
      }

      toast({
        title: 'Update Submitted for Review',
        description: `Your ${proofStageOptions.find(p => p.value === proofStage)?.label || 'update'} with GPS-verified proof has been submitted.`,
      });

      onComplete();
      onOpenChange(false);
      
      // Reset form
      setMessage('');
      setCapturedImage(null);
      setWatermarkedImage(null);
      setWatermarkMetadata(null);
      setCurrentLocation(null);
      setProofStage('general');
      setSubmissionState({ step: 'idle', progress: 0, message: '' });
    } catch (error) {
      console.error('Update error:', error);
      setSubmissionState({ step: 'error', progress: 0, message: 'Submission failed' });
      toast({
        title: 'Error',
        description: 'Failed to submit update. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRetakePhoto = () => {
    setCapturedImage(null);
    setWatermarkedImage(null);
    setWatermarkMetadata(null);
    setCurrentLocation(null);
    setShowCamera(true);
  };

  if (showCamera) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Capture Photo</DialogTitle>
          </DialogHeader>
          <LiveCameraCapture
            inline
            onCapture={handleCapture}
            onCancel={() => setShowCamera(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-2 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Field Update
          </DialogTitle>
          <DialogDescription>
            Update the status of work order WO-{workOrder.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto p-6 pt-2 flex-1">
          {/* Status Selection */}
          <div className="space-y-3">
            <Label>Status</Label>
            <RadioGroup value={status} onValueChange={(v) => setStatus(v as WorkOrderUpdate['status'])}>
              <div className="grid grid-cols-3 gap-2">
                {statusOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <div key={option.value}>
                      <RadioGroupItem
                        value={option.value}
                        id={`status-${option.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`status-${option.value}`}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors
                          ${status === option.value 
                            ? 'border-primary bg-primary/10' 
                            : 'border-muted hover:border-primary/50'
                          }`}
                      >
                        <Icon className={`w-5 h-5 ${option.color}`} />
                        <span className="text-sm">{option.label}</span>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Proof Stage Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Proof Stage
            </Label>
            <RadioGroup value={proofStage} onValueChange={(v) => setProofStage(v as ProofStage)}>
              <div className="grid grid-cols-2 gap-2">
                {proofStageOptions.map((option) => (
                  <div key={option.value}>
                    <RadioGroupItem
                      value={option.value}
                      id={`stage-${option.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`stage-${option.value}`}
                      className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-colors
                        ${proofStage === option.value 
                          ? 'border-primary bg-primary/10' 
                          : 'border-muted hover:border-primary/50'
                        }`}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
            {proofStage !== 'general' && (
              <div className="flex items-center gap-2 text-sm text-warning">
                <Camera className="w-4 h-4" />
                <span>GPS-verified photo required for {proofStageOptions.find(p => p.value === proofStage)?.label}</span>
              </div>
            )}
            
            {/* Working Stage Photo Counter */}
            {isWorkingStage && (
              <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Working Photos:</span>
                  <Badge variant={photoStats.canAddMore ? 'secondary' : 'destructive'}>
                    {photoStats.total} / {MAX_WORKING_PHOTOS}
                  </Badge>
                </div>
                {!photoStats.canAddMore && (
                  <span className="text-xs text-destructive">Max reached</span>
                )}
              </div>
            )}
          </div>

          {/* Update Type */}
          <div className="space-y-2">
            <Label>Update Type</Label>
            <RadioGroup 
              value={updateType} 
              onValueChange={(v) => setUpdateType(v as WorkOrderUpdate['update_type'])}
              className="flex flex-wrap gap-2"
            >
              {updateTypeOptions.map((option) => (
                <div key={option.value}>
                  <RadioGroupItem
                    value={option.value}
                    id={`type-${option.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`type-${option.value}`}
                    className={`px-3 py-1 rounded-full cursor-pointer text-sm transition-colors
                      ${updateType === option.value 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted hover:bg-muted/80'
                      }`}
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message / Notes</Label>
            <Textarea
              id="message"
              placeholder={
                updateType === 'clarification' 
                  ? 'What clarification do you need?'
                  : updateType === 'delay_reason'
                    ? 'What is causing the delay?'
                    : updateType === 'escalation'
                      ? 'What needs to be escalated?'
                      : 'Add any notes about the update...'
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Photo Capture with Watermark Preview */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Photo Evidence {requiresPhoto && <Badge variant="outline" className="text-xs">Required</Badge>}
            </Label>
            {watermarkedImage ? (
              <div className="relative">
                <img 
                  src={watermarkedImage} 
                  alt="Watermarked Proof" 
                  className="w-full h-48 object-cover rounded-lg border-2 border-primary/30"
                />
                <div className="absolute top-2 left-2">
                  <Badge className="bg-primary/90 text-primary-foreground gap-1">
                    <Shield className="w-3 h-3" />
                    GPS Verified
                  </Badge>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-2 right-2"
                  onClick={handleRetakePhoto}
                >
                  Retake
                </Button>
                
                {/* Watermark Metadata Display */}
                {watermarkMetadata && (
                  <div className="mt-2 space-y-1 p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{watermarkMetadata.lat.toFixed(6)}°, {watermarkMetadata.lng.toFixed(6)}°</span>
                      {watermarkMetadata.accuracy && (
                        <span className="text-xs">(±{Math.round(watermarkMetadata.accuracy)}m)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {watermarkMetadata.isLocationValid ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          <span className="text-success">
                            {Math.round(watermarkMetadata.distanceFromComplaint || 0)}m from complaint site - Verified
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          <span className="text-destructive">
                            {Math.round(watermarkMetadata.distanceFromComplaint || 0)}m away - Location Mismatch
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : capturedImage ? (
              <div className="relative">
                <img 
                  src={capturedImage} 
                  alt="Processing..." 
                  className="w-full h-40 object-cover rounded-lg opacity-50"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              </div>
            ) : isCaptureDisabled ? (
              <div className="w-full p-4 rounded-lg border-2 border-dashed border-destructive/50 bg-destructive/5 text-center">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-destructive" />
                <p className="text-sm font-medium text-destructive">Maximum {MAX_WORKING_PHOTOS} working photos allowed</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You've captured {photoStats.total} photos for this work order
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-24 flex flex-col gap-2"
                onClick={() => setShowCamera(true)}
                disabled={submissionState.step !== 'idle' || loadingPhotos}
              >
                <Camera className="w-6 h-6" />
                <span>Capture Live Photo with GPS Watermark</span>
                {isWorkingStage && photoStats.remaining > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {photoStats.remaining} photo{photoStats.remaining !== 1 ? 's' : ''} remaining
                  </span>
                )}
              </Button>
            )}
          </div>

          {/* Submission Progress */}
          {submissionState.step !== 'idle' && submissionState.step !== 'error' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{submissionState.message}</span>
              </div>
              <Progress value={submissionState.progress} className="h-2" />
            </div>
          )}

          {/* Location Mismatch Warning */}
          {isLocationMismatch && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Your current location is more than 500m from the complaint location. 
                This will be flagged for admin review.
              </AlertDescription>
            </Alert>
          )}



          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => onOpenChange(false)}
              disabled={submissionState.step !== 'idle'}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleSubmit}
              disabled={!canSubmit || submissionState.step !== 'idle'}
            >
              {submissionState.step !== 'idle' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {submissionState.message}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Submit for Review
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
