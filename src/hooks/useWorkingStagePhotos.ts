import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { useAuth } from '@/contexts/AuthContext';
import { ProofStage } from './useEngineerUpdates';

export const WORKING_STAGES: ProofStage[] = ['before', 'wip', 'after'];

export const MIN_WORKING_PHOTOS = 1;
export const MAX_WORKING_PHOTOS = 5;

export interface WorkingStagePhoto {
  id: string;
  work_order_id: string;
  proof_stage: ProofStage;
  image_url: string | null;
  created_at: string;
  gps_lat: number | null;
  gps_lng: number | null;
  approval_status: string;
}

export interface WorkingPhotoStats {
  total: number;
  byStage: Record<ProofStage, number>;
  canAddMore: boolean;
  needsMinimum: boolean;
  remaining: number;
}

export function useWorkingStagePhotos(workOrderId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['working-stage-photos', workOrderId],
    queryFn: async (): Promise<WorkingStagePhoto[]> => {
      if (!workOrderId || !db) return [];

      const q = query(
        collection(db, 'work_order_updates'),
        where('work_order_id', '==', workOrderId),
        where('proof_stage', 'in', WORKING_STAGES),
        orderBy('created_at', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs
        .filter(d => d.data().image_url !== null)
        .map(d => ({ id: d.id, ...d.data() } as WorkingStagePhoto));
    },
    enabled: !!workOrderId && !!user?.id,
  });
}

export function calculateWorkingPhotoStats(photos: WorkingStagePhoto[]): WorkingPhotoStats {
  const byStage: Record<ProofStage, number> = {
    before: 0,
    wip: 0,
    after: 0,
    general: 0,
  };

  photos.forEach(photo => {
    if (photo.image_url && WORKING_STAGES.includes(photo.proof_stage)) {
      byStage[photo.proof_stage]++;
    }
  });

  const total = byStage.before + byStage.wip + byStage.after;

  return {
    total,
    byStage,
    canAddMore: total < MAX_WORKING_PHOTOS,
    needsMinimum: total < MIN_WORKING_PHOTOS,
    remaining: MAX_WORKING_PHOTOS - total,
  };
}

export function useValidateWorkingPhoto(workOrderId: string | null) {
  const { data: photos = [], isLoading } = useWorkingStagePhotos(workOrderId);
  const stats = calculateWorkingPhotoStats(photos);

  const validateCanAddPhoto = (stage: ProofStage): { valid: boolean; message?: string } => {
    if (!WORKING_STAGES.includes(stage)) {
      return { valid: true };
    }
    if (stats.total >= MAX_WORKING_PHOTOS) {
      return {
        valid: false,
        message: `Maximum ${MAX_WORKING_PHOTOS} working photos allowed. You have used all ${MAX_WORKING_PHOTOS}.`,
      };
    }
    return { valid: true };
  };

  const validateCanSubmit = (): { valid: boolean; message?: string } => {
    if (stats.total < MIN_WORKING_PHOTOS) {
      return {
        valid: false,
        message: `At least ${MIN_WORKING_PHOTOS} working photo is required before final submission.`,
      };
    }
    return { valid: true };
  };

  return {
    photos,
    stats,
    isLoading,
    validateCanAddPhoto,
    validateCanSubmit,
  };
}

export function useServerValidateWorkingPhotos() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      work_order_id: string;
      proof_stage: ProofStage;
    }): Promise<{ valid: boolean; currentCount: number; message?: string }> => {
      if (!user?.id || !db) throw new Error('Not authenticated');

      if (!WORKING_STAGES.includes(data.proof_stage)) {
        return { valid: true, currentCount: 0 };
      }

      const q = query(
        collection(db, 'work_order_updates'),
        where('work_order_id', '==', data.work_order_id),
        where('proof_stage', 'in', WORKING_STAGES)
      );

      const snapshot = await getDocs(q);
      const currentCount = snapshot.docs.filter(d => d.data().image_url !== null).length;

      if (currentCount >= MAX_WORKING_PHOTOS) {
        return {
          valid: false,
          currentCount,
          message: `Maximum ${MAX_WORKING_PHOTOS} working photos allowed. Current: ${currentCount}.`,
        };
      }

      return { valid: true, currentCount };
    },
  });
}

export function useDeleteWorkingPhoto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updateId: string) => {
      if (!user?.id || !db) throw new Error('Not authenticated');

      const docRef = doc(db, 'work_order_updates', updateId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Update not found');
      }

      const data = docSnap.data();
      if (data.engineer_id !== user.id || data.approval_status !== 'pending') {
        throw new Error('Cannot delete this update');
      }

      await deleteDoc(docRef);
      return data.work_order_id;
    },
    onSuccess: (workOrderId) => {
      queryClient.invalidateQueries({ queryKey: ['working-stage-photos', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['work-order-updates', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
    },
  });
}
