import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  ComplaintRow,
  fetchAllComplaints,
  fetchUserComplaints,
  createComplaint,
  uploadComplaintImage,
  updateComplaintStatus,
  subscribeToComplaints,
  subscribeToUserComplaints,
  ComplaintData,
} from '@/services/complaintsService';
import { checkForDuplicates } from '@/services/duplicateDetectionService';
import { Complaint } from '@/components/ComplaintCard';

// Convert database row to UI complaint format
export function dbToUiComplaint(c: ComplaintRow): Complaint {
  return {
    id: c.id,
    category: c.category,
    subCategory: c.sub_category || undefined,
    description: c.description,
    location: { lat: c.lat, lng: c.lng, address: c.address || 'Unknown' },
    status: c.status as 'pending' | 'in_progress' | 'completed',
    urgency: c.urgency as 'high' | 'medium' | 'low' | undefined,
    createdAt: new Date(c.created_at),
    userId: c.user_id,
    assignedTo: c.assigned_to || undefined,
    imageUrl: c.image_url,
    pointsAwarded: c.points_awarded || undefined,
    // Duplicate detection fields
    isDuplicate: c.is_duplicate || false,
    duplicateType: c.duplicate_type as 'exact' | 'similar' | null,
    masterIssueId: c.master_issue_id,
    matchConfidence: c.match_confidence,
    matchReason: c.match_reason,
  };
}

// Hook for all complaints with real-time updates (Admin/Engineer)
export function useAllComplaintsRealtime() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Initial fetch
  useEffect(() => {
    const loadComplaints = async () => {
      try {
        setIsLoading(true);
        const data = await fetchAllComplaints();
        setComplaints(data.map(dbToUiComplaint));
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching complaints:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadComplaints();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = subscribeToComplaints(
      // On INSERT
      (newComplaint) => {
        setComplaints((prev) => {
          // Avoid duplicates
          if (prev.some(c => c.id === newComplaint.id)) return prev;
          return [dbToUiComplaint(newComplaint), ...prev];
        });
        toast({
          title: '📋 New Complaint',
          description: `New ${newComplaint.category} complaint received`,
        });
      },
      // On UPDATE
      (updatedComplaint) => {
        setComplaints((prev) =>
          prev.map((c) =>
            c.id === updatedComplaint.id ? dbToUiComplaint(updatedComplaint) : c
          )
        );
        toast({
          title: '🔄 Complaint Updated',
          description: `Status changed to ${updatedComplaint.status.replace('_', ' ')}`,
        });
      },
      // On DELETE
      (deletedId) => {
        setComplaints((prev) => prev.filter((c) => c.id !== deletedId));
      }
    );

    return unsubscribe;
  }, [toast]);

  return { complaints, isLoading, error };
}

// Hook for citizen's own complaints with real-time updates
export function useCitizenComplaints() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Initial fetch
  useEffect(() => {
    if (!user?.id) {
      setComplaints([]);
      setIsLoading(false);
      return;
    }

    const loadComplaints = async () => {
      try {
        setIsLoading(true);
        const data = await fetchUserComplaints(user.id);
        setComplaints(data.map(dbToUiComplaint));
        setError(null);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching user complaints:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadComplaints();
  }, [user?.id]);

  // Real-time subscription for user's complaints
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToUserComplaints(
      user.id,
      // On INSERT
      (newComplaint) => {
        setComplaints((prev) => {
          if (prev.some(c => c.id === newComplaint.id)) return prev;
          return [dbToUiComplaint(newComplaint), ...prev];
        });
      },
      // On UPDATE
      (updatedComplaint) => {
        setComplaints((prev) =>
          prev.map((c) =>
            c.id === updatedComplaint.id ? dbToUiComplaint(updatedComplaint) : c
          )
        );
        
        // Notify citizen of status changes
        if (updatedComplaint.status === 'completed') {
          toast({
            title: '🎉 Complaint Resolved!',
            description: `Your complaint has been resolved. +${updatedComplaint.points_awarded || 10} points!`,
          });
        } else if (updatedComplaint.status === 'in_progress') {
          toast({
            title: '🔧 Work Started',
            description: 'An engineer has started working on your complaint.',
          });
        }
      }
    );

    return unsubscribe;
  }, [user?.id, toast]);

  // Submit new complaint
  const submitComplaint = useCallback(
    async (data: {
      category: string;
      subCategory?: string;
      description: string;
      imageData: string;
      lat: number;
      lng: number;
      address?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Upload image first
      const imageUrl = await uploadComplaintImage(data.imageData, user.id);

      // Create complaint
      const complaintData: ComplaintData = {
        category: data.category,
        sub_category: data.subCategory,
        description: data.description,
        lat: data.lat,
        lng: data.lng,
        address: data.address,
        image_url: imageUrl,
      };

      const newComplaint = await createComplaint(complaintData, user.id);
      
      // Add to local state immediately (real-time will also update)
      setComplaints((prev) => [dbToUiComplaint(newComplaint), ...prev]);
      
      // Trigger duplicate detection asynchronously (don't block submission)
      checkForDuplicates(
        newComplaint.id,
        data.lat,
        data.lng,
        imageUrl,
        data.category,
        data.subCategory
      ).then((result) => {
        if (result.isDuplicate) {
          console.log(`Duplicate detected: ${result.duplicateType} with ${result.matchConfidence}% confidence`);
        }
      }).catch((err) => {
        console.error('Duplicate check failed:', err);
      });
      
      return newComplaint;
    },
    [user?.id]
  );

  return { complaints, isLoading, error, submitComplaint };
}

// Hook for updating complaint status (Admin)
export function useUpdateStatus() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const updateStatus = useCallback(
    async (complaintId: string, status: 'pending' | 'in_progress' | 'completed' | 'rejected', urgency?: 'high' | 'medium' | 'low') => {
      try {
        setIsUpdating(true);
        await updateComplaintStatus(complaintId, status, urgency);
        toast({
          title: '✅ Status Updated',
          description: `Complaint status changed to ${status.replace('_', ' ')}`,
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to update status',
          variant: 'destructive',
        });
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [toast]
  );

  return { updateStatus, isUpdating };
}
