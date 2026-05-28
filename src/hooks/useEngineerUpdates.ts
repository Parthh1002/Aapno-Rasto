import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc, addDoc, updateDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { useAuth } from '@/contexts/AuthContext';

export type ProofStage = 'before' | 'wip' | 'after' | 'general';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface EngineerUpdate {
  id: string;
  work_order_id: string;
  engineer_id: string;
  status: 'started' | 'in_progress' | 'blocked' | 'resumed' | 'completed';
  message: string | null;
  update_type: 'status' | 'clarification' | 'delay_reason' | 'escalation' | 'general';
  image_url: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_verified: boolean;
  gps_distance_meters: number | null;
  proof_stage: ProofStage;
  approval_status: ApprovalStatus;
  review_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  citizen_user_id: string | null;
  created_at: string;
}

export interface EngineerUpdateWithComplaint extends EngineerUpdate {
  work_order?: {
    id: string;
    complaint_id: string;
    engineer_id: string;
    status: string;
    complaint?: {
      id: string;
      category: string;
      sub_category: string | null;
      description: string;
      address: string | null;
      image_url: string;
      user_id: string;
    };
  };
}

export function useSubmitEngineerUpdate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      work_order_id: string;
      citizen_user_id: string;
      status: EngineerUpdate['status'];
      message?: string;
      update_type?: EngineerUpdate['update_type'];
      image_url?: string;
      gps_lat?: number;
      gps_lng?: number;
      gps_distance_meters?: number;
      proof_stage: ProofStage;
    }) => {
      if (!user?.id || !db) throw new Error('Not authenticated');

      const updateData = {
        work_order_id: data.work_order_id,
        engineer_id: user.id,
        citizen_user_id: data.citizen_user_id,
        status: data.status,
        message: data.message || null,
        update_type: data.update_type || 'status',
        image_url: data.image_url || null,
        gps_lat: data.gps_lat || null,
        gps_lng: data.gps_lng || null,
        gps_distance_meters: data.gps_distance_meters || null,
        gps_verified: data.gps_distance_meters ? data.gps_distance_meters <= 500 : false,
        proof_stage: data.proof_stage,
        approval_status: 'approved' as const, // AUTO-APPROVE
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'system_auto_approve',
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'work_order_updates'), updateData);

      if (data.status === 'completed' || data.proof_stage === 'after') {
        // Complete the work order
        await updateDoc(doc(db, 'work_orders', data.work_order_id), {
          status: 'completed',
          actual_completion_date: new Date().toISOString(),
        });

        // Complete the complaint and award points instantly
        const woSnap = await getDoc(doc(db, 'work_orders', data.work_order_id));
        if (woSnap.exists()) {
          const compId = woSnap.data().complaint_id;
          if (compId) {
            await updateDoc(doc(db, 'complaints', compId), {
              status: 'completed',
              resolved_at: new Date().toISOString(),
              points_awarded: 10,
            });
          }
        }
      } else {
        const newStatus = data.status === 'blocked' ? 'blocked' : 'in_progress';
        await updateDoc(doc(db, 'work_orders', data.work_order_id), { status: newStatus });
      }

      return { id: docRef.id, ...updateData };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', variables.work_order_id] });
      queryClient.invalidateQueries({ queryKey: ['work-order-updates', variables.work_order_id] });
      queryClient.invalidateQueries({ queryKey: ['working-stage-photos', variables.work_order_id] });
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
    },
  });
}

export function usePendingReviews() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryObj = useQuery({
    queryKey: ['pending-reviews'],
    queryFn: async () => {
      if (!db || !user?.id) return [];

      const q = query(
        collection(db, 'work_order_updates'),
        where('approval_status', '==', 'pending'),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      const updates = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EngineerUpdateWithComplaint));

      for (const update of updates) {
        const woSnap = await getDoc(doc(db, 'work_orders', update.work_order_id));
        if (woSnap.exists()) {
          const woData = woSnap.data();
          update.work_order = {
            id: woSnap.id,
            complaint_id: woData.complaint_id,
            engineer_id: woData.engineer_id,
            status: woData.status,
          };
          if (woData.complaint_id) {
            const compSnap = await getDoc(doc(db, 'complaints', woData.complaint_id));
            if (compSnap.exists()) {
              update.work_order.complaint = { id: compSnap.id, ...compSnap.data() } as any;
            }
          }
        }
      }
      return updates;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user?.id || !db) return;

    const q = query(collection(db, 'work_order_updates'));
    const unsub = onSnapshot(q, () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
    });

    return () => unsub();
  }, [user?.id, queryClient]);

  return queryObj;
}

export function useReviewUpdate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      update_id: string;
      action: 'approve' | 'reject';
      review_note?: string;
      work_order_id: string;
    }) => {
      if (!user?.id || !db) throw new Error('Not authenticated');

      const approval_status = data.action === 'approve' ? 'approved' : 'rejected';
      const docRef = doc(db, 'work_order_updates', data.update_id);
      
      await updateDoc(docRef, {
        approval_status,
        review_note: data.review_note || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      });

      const updatedSnap = await getDoc(docRef);
      const updateData = updatedSnap.data() as EngineerUpdate;

      if (data.action === 'approve') {
        if (updateData.proof_stage === 'after' || updateData.status === 'completed') {
          await updateDoc(doc(db, 'work_orders', data.work_order_id), {
            status: 'completed',
            actual_completion_date: new Date().toISOString(),
          });

          const woSnap = await getDoc(doc(db, 'work_orders', data.work_order_id));
          if (woSnap.exists()) {
            const compId = woSnap.data().complaint_id;
            if (compId) {
              await updateDoc(doc(db, 'complaints', compId), {
                status: 'completed',
                resolved_at: new Date().toISOString(),
                points_awarded: 10,
              });
            }
          }
        }
      }
      return { id: docRef.id, ...updateData };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', variables.work_order_id] });
      queryClient.invalidateQueries({ queryKey: ['work-order-updates', variables.work_order_id] });
      queryClient.invalidateQueries({ queryKey: ['approved-updates'] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
  });
}

export function useApprovedUpdates(complaintId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['approved-updates', complaintId],
    queryFn: async () => {
      if (!complaintId || !user?.id || !db) return [];

      const qWo = query(collection(db, 'work_orders'), where('complaint_id', '==', complaintId));
      const snapWo = await getDocs(qWo);
      if (snapWo.empty) return [];
      const workOrderId = snapWo.docs[0].id;

      const qUpdates = query(
        collection(db, 'work_order_updates'),
        where('work_order_id', '==', workOrderId),
        where('citizen_user_id', '==', user.id),
        where('approval_status', '==', 'approved'),
        orderBy('created_at', 'asc')
      );

      const snapUpdates = await getDocs(qUpdates);
      return snapUpdates.docs.map(d => ({ id: d.id, ...d.data() } as EngineerUpdate));
    },
    enabled: !!complaintId && !!user?.id,
  });
}

export function useWorkOrderUpdatesWithStage(workOrderId: string | null) {
  return useQuery({
    queryKey: ['work-order-updates-staged', workOrderId],
    queryFn: async () => {
      if (!workOrderId || !db) return [];

      const q = query(
        collection(db, 'work_order_updates'),
        where('work_order_id', '==', workOrderId),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EngineerUpdate));
    },
    enabled: !!workOrderId,
  });
}
