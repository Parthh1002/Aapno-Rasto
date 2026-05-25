import React, { useState } from 'react';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ResolutionPhotoUpload } from './ResolutionPhotoUpload';
import { Complaint } from '@/types/models';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { uploadToStorage } from '@/lib/storage';

interface CompleteComplaintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  complaintId: string;
  complaintCategory: string;
}

export function CompleteComplaintModal({
  open,
  onOpenChange,
  complaintId,
  complaintCategory,
}: CompleteComplaintModalProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (photos.length === 0) {
      toast({
        title: 'Photos Required',
        description: 'Please upload at least 1 resolution proof photo',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      if (!db) throw new Error('Firebase not initialized');

      const uploadedUrls: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const fileName = `complaints/${complaintId}/resolution_${Date.now()}_${i}.${photo.name.split('.').pop()}`;
        
        const downloadUrl = await uploadToStorage(photo, fileName, photo.type);
        uploadedUrls.push(downloadUrl);
      }

      const docRef = doc(db, 'complaints', complaintId);
      await updateDoc(docRef, {
        status: 'completed',
        resolution_photos: uploadedUrls,
        resolution_notes: notes || null,
        resolved_at: new Date().toISOString(),
        points_awarded: 10,
      });

      toast({
        title: '✅ Complaint Resolved',
        description: 'Resolution proof uploaded and 10 points awarded!',
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['complaints'] });

      // Reset and close
      setPhotos([]);
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error completing complaint:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete complaint. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setPhotos([]);
      setNotes('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-accent" />
            Complete Complaint
          </DialogTitle>
          <DialogDescription>
            Upload resolution proof photos to mark complaint <strong>{complaintId.slice(0, 8)}...</strong> as completed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Category Info */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Category</p>
            <p className="font-medium capitalize">{complaintCategory.replace(/([A-Z])/g, ' $1').trim()}</p>
          </div>

          {/* Photo Upload */}
          <ResolutionPhotoUpload
            photos={photos}
            onPhotosChange={setPhotos}
            maxPhotos={3}
            disabled={isUploading}
          />

          {/* Resolution Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Resolution Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Describe the work completed..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isUploading}
              rows={3}
            />
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 text-accent">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">After submission:</p>
              <ul className="list-disc list-inside mt-1 text-xs opacity-80">
                <li>Complaint status will change to "Completed"</li>
                <li>Citizen will receive a notification</li>
                <li>10 reward points will be credited to citizen</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={photos.length === 0 || isUploading}
            className="min-w-[140px]"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
