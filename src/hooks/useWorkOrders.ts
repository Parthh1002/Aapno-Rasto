import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { useAuth } from '@/contexts/AuthContext';
import { 
  WorkOrder, 
  TaskBreakdownItem, 
  MaterialItem, 
  ToolItem, 
  CrewMember, 
  SafetyChecklistItem, 
  SafetyChecklist, 
  WorkOrderUpdate,
  Complaint as VerificationQueueItem 
} from '@/types/models';

export type {
  WorkOrder, 
  TaskBreakdownItem, 
  MaterialItem, 
  ToolItem, 
  CrewMember, 
  SafetyChecklistItem, 
  SafetyChecklist, 
  WorkOrderUpdate,
  VerificationQueueItem 
};

// Helper to transform DB row to WorkOrder
function transformWorkOrder(docData: any, id: string): WorkOrder {
  return {
    ...docData,
    id,
    task_breakdown: (docData.task_breakdown as TaskBreakdownItem[]) || [],
    materials_required: (docData.materials_required as MaterialItem[]) || [],
    tools_required: (docData.tools_required as ToolItem[]) || [],
    assigned_crew: (docData.assigned_crew as CrewMember[]) || [],
  } as WorkOrder;
}

export function useVerificationQueue() {
  return useQuery({
    queryKey: ['verification-queue'],
    queryFn: async () => {
      if (!db) return [];
      const q = query(
        collection(db, 'complaints'),
        where('ai_verified', '==', true),
        where('assigned_to', '==', null),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as VerificationQueueItem));
      // Client-side sort to avoid requiring composite indexes
      docs.sort((a, b) => {
        const rankA = a.priority_rank || 0;
        const rankB = b.priority_rank || 0;
        if (rankB !== rankA) return rankB - rankA; // desc
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); // asc
      });
      return docs;
    },
  });
}

export function usePendingVerification() {
  return useQuery({
    queryKey: ['pending-verification'],
    queryFn: async () => {
      if (!db) return [];
      const q = query(
        collection(db, 'complaints'),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as VerificationQueueItem));
      // Client-side sort to avoid requiring composite indexes
      docs.sort((a, b) => {
        const rankA = a.priority_rank || 0;
        const rankB = b.priority_rank || 0;
        if (rankB !== rankA) return rankB - rankA; // desc
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); // asc
      });
      return docs;
    },
  });
}

export function useEngineerWorkOrders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryObj = useQuery({
    queryKey: ['work-orders', user?.id],
    queryFn: async () => {
      if (!user?.id || !db) return [];

      const q = query(
        collection(db, 'work_orders'),
        where('engineer_id', '==', user.id)
      );

      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map(d => transformWorkOrder(d.data(), d.id));
      orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Fetch associated complaints
      for (const order of orders) {
        if (order.complaint_id) {
          const compSnap = await getDoc(doc(db, 'complaints', order.complaint_id));
          if (compSnap.exists()) {
             order.complaint = { id: compSnap.id, ...compSnap.data() } as VerificationQueueItem;
          }
        }
      }
      return orders;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user?.id || !db) return;
    const q1 = query(collection(db, 'work_orders'), where('engineer_id', '==', user.id));
    const unsub1 = onSnapshot(q1, () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders', user.id] });
    });
    
    return () => {
      unsub1();
    };
  }, [user?.id, queryClient]);

  return queryObj;
}

export function useWorkOrder(workOrderId: string | null) {
  const queryClient = useQueryClient();

  const queryObj = useQuery({
    queryKey: ['work-order', workOrderId],
    queryFn: async () => {
      if (!workOrderId || !db) return null;

      const docSnap = await getDoc(doc(db, 'work_orders', workOrderId));
      if (!docSnap.exists()) throw new Error("Not found");
      
      const order = transformWorkOrder(docSnap.data(), docSnap.id);
      
      if (order.complaint_id) {
        const compSnap = await getDoc(doc(db, 'complaints', order.complaint_id));
        if (compSnap.exists()) {
           order.complaint = { id: compSnap.id, ...compSnap.data() } as VerificationQueueItem;
        }
      }
      return order;
    },
    enabled: !!workOrderId,
  });

  useEffect(() => {
    if (!workOrderId || !db) return;
    const unsub1 = onSnapshot(doc(db, 'work_orders', workOrderId), () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
    });
    const q2 = query(collection(db, 'work_order_updates'), where('work_order_id', '==', workOrderId));
    const unsub2 = onSnapshot(q2, () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-updates', workOrderId] });
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [workOrderId, queryClient]);

  return queryObj;
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      complaint_id: string;
      task_breakdown?: TaskBreakdownItem[];
      materials_required?: MaterialItem[];
      tools_required?: ToolItem[];
      assigned_crew?: CrewMember[];
      estimated_duration_hours?: number;
      start_date?: string;
      expected_completion_date?: string;
      sla_deadline?: string;
    }) => {
      if (!user?.id || !db) throw new Error('Not authenticated');

      await updateDoc(doc(db, 'complaints', data.complaint_id), {
        assigned_to: user.id,
        verified_by_engineer: user.id,
        engineer_verified_at: new Date().toISOString(),
        status: 'in_progress',
      });

      const workOrderData = {
        complaint_id: data.complaint_id,
        engineer_id: user.id,
        task_breakdown: data.task_breakdown || [],
        materials_required: data.materials_required || [],
        tools_required: data.tools_required || [],
        assigned_crew: data.assigned_crew || [],
        estimated_duration_hours: data.estimated_duration_hours || null,
        start_date: data.start_date || null,
        expected_completion_date: data.expected_completion_date || null,
        sla_deadline: data.sla_deadline || null,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'work_orders'), workOrderData);
      return { id: docRef.id, ...workOrderData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-queue'] });
      queryClient.invalidateQueries({ queryKey: ['pending-verification'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-complaints'] });
    },
  });
}

export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<WorkOrder> & { id: string }) => {
      if (!db) throw new Error('Firebase not initialized');
      
      const updateData: Record<string, any> = { ...data, updated_at: new Date().toISOString() };
      delete updateData.complaint; // don't write joined data
      
      await updateDoc(doc(db, 'work_orders', id), updateData);
      const updatedSnap = await getDoc(doc(db, 'work_orders', id));
      return { id: updatedSnap.id, ...updatedSnap.data() };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', variables.id] });
    },
  });
}

export function useSafetyChecklistTemplate(category: string, subCategory?: string | null) {
  return useQuery({
    queryKey: ['safety-template', category, subCategory],
    queryFn: async () => {
      if (!db) return null;
      let q = query(
        collection(db, 'safety_checklist_templates'),
        where('category', '==', category),
        where('is_active', '==', true)
      );
      
      if (subCategory) {
        q = query(q, where('sub_category', '==', subCategory));
      } else {
        q = query(q, where('sub_category', '==', null));
      }
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    },
    enabled: !!category,
  });
}

export function useSafetyChecklist(workOrderId: string | null) {
  return useQuery({
    queryKey: ['safety-checklist', workOrderId],
    queryFn: async () => {
      if (!workOrderId || !db) return null;
      const q = query(collection(db, 'safety_checklists'), where('work_order_id', '==', workOrderId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SafetyChecklist;
    },
    enabled: !!workOrderId,
  });
}

export function useUpsertSafetyChecklist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      work_order_id: string;
      checklist_items: SafetyChecklistItem[];
    }) => {
      if (!db) throw new Error('Firebase not initialized');
      const allRequiredCompleted = data.checklist_items
        .filter(item => item.required)
        .every(item => item.checked);

      // find existing
      const q = query(collection(db, 'safety_checklists'), where('work_order_id', '==', data.work_order_id));
      const snapshot = await getDocs(q);
      
      const checklistData = {
        work_order_id: data.work_order_id,
        checklist_items: data.checklist_items,
        all_required_completed: allRequiredCompleted,
        completed_at: allRequiredCompleted ? new Date().toISOString() : null,
        completed_by: allRequiredCompleted ? user?.id : null,
      };

      if (!snapshot.empty) {
        const existingId = snapshot.docs[0].id;
        await updateDoc(doc(db, 'safety_checklists', existingId), checklistData);
        return { id: existingId, ...checklistData };
      } else {
        const docRef = await addDoc(collection(db, 'safety_checklists'), checklistData);
        return { id: docRef.id, ...checklistData };
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['safety-checklist', variables.work_order_id] });
    },
  });
}

export function useAddWorkOrderUpdate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      work_order_id: string;
      status: WorkOrderUpdate['status'];
      message?: string;
      update_type?: WorkOrderUpdate['update_type'];
      image_url?: string;
      gps_lat?: number;
      gps_lng?: number;
      gps_distance_meters?: number;
    }) => {
      if (!user?.id || !db) throw new Error('Not authenticated');

      const updateData = {
        work_order_id: data.work_order_id,
        engineer_id: user.id,
        status: data.status,
        message: data.message || null,
        update_type: data.update_type || 'status',
        image_url: data.image_url || null,
        gps_lat: data.gps_lat || null,
        gps_lng: data.gps_lng || null,
        gps_distance_meters: data.gps_distance_meters || null,
        gps_verified: data.gps_distance_meters ? data.gps_distance_meters <= 500 : false,
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'work_order_updates'), updateData);

      const newStatus = data.status === 'completed' ? 'completed' : data.status === 'blocked' ? 'blocked' : 'in_progress';
      await updateDoc(doc(db, 'work_orders', data.work_order_id), { status: newStatus, updated_at: new Date().toISOString() });

      return { id: docRef.id, ...updateData };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', variables.work_order_id] });
      queryClient.invalidateQueries({ queryKey: ['work-order-updates', variables.work_order_id] });
    },
  });
}

export function useWorkOrderUpdates(workOrderId: string | null) {
  return useQuery({
    queryKey: ['work-order-updates', workOrderId],
    queryFn: async () => {
      if (!workOrderId || !db) return [];

      const q = query(
        collection(db, 'work_order_updates'),
        where('work_order_id', '==', workOrderId),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WorkOrderUpdate));
    },
    enabled: !!workOrderId,
  });
}
