import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, getDocs, orderBy, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Complaint } from '@/types/models';
import { uploadToStorage } from '@/lib/storage';

export interface CreateComplaintData {
  category: string;
  sub_category?: string;
  description: string;
  lat: number;
  lng: number;
  address?: string;
  image_url: string;
  urgency?: 'low' | 'medium' | 'high';
}

export interface ResolveComplaintData {
  id: string;
  resolution_image_url: string;
  resolution_notes: string;
  resolution_lat: number;
  resolution_lng: number;
  location_mismatch: boolean;
}

// Fetch all complaints (for admin/engineer)
export function useAllComplaints() {
  return useQuery({
    queryKey: ['complaints', 'all'],
    queryFn: async () => {
      if (!db) return [];
      const q = query(collection(db, 'complaints'), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
    },
  });
}

// Fetch user's own complaints (for citizens)
export function useMyComplaints() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['complaints', 'my', user?.id],
    queryFn: async () => {
      if (!user?.id || !db) return [];
      
      const q = query(
        collection(db, 'complaints'),
        where('user_id', '==', user.id),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
    },
    enabled: !!user?.id,
  });
}

// Fetch assigned complaints (for engineers)
export function useAssignedComplaints() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['complaints', 'assigned', user?.id],
    queryFn: async () => {
      if (!user?.id || !db) return [];
      
      const q = query(
        collection(db, 'complaints'),
        where('assigned_to', '==', user.id),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
    },
    enabled: !!user?.id,
  });
}

// Create a new complaint
export function useCreateComplaint() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: CreateComplaintData) => {
      if (!user?.id) throw new Error('User not authenticated');
      if (!db) throw new Error('Firebase not initialized');
      
      const complaintData = {
        ...data,
        user_id: user.id,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const docRef = await addDoc(collection(db, 'complaints'), complaintData);
      return { id: docRef.id, ...complaintData } as Complaint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
  });
}

// Assign complaint to engineer (admin only)
export function useAssignComplaint() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ complaintId, engineerId }: { complaintId: string; engineerId: string }) => {
      if (!db) throw new Error('Firebase not initialized');
      
      const docRef = doc(db, 'complaints', complaintId);
      await updateDoc(docRef, {
        assigned_to: engineerId,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      });
      
      // Auto-create a work order so the engineer sees it in their active dashboard
      const workOrderData = {
        complaint_id: complaintId,
        engineer_id: engineerId,
        task_breakdown: [],
        materials_required: [],
        tools_required: [],
        assigned_crew: [],
        estimated_duration_hours: null,
        start_date: new Date().toISOString(),
        expected_completion_date: null,
        sla_deadline: null,
        status: 'in_progress', // Admin assigned directly, so it's in progress
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await addDoc(collection(db, 'work_orders'), workOrderData);
      
      const updatedDoc = await getDoc(docRef);
      return { id: updatedDoc.id, ...updatedDoc.data() } as Complaint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
}

// Resolve complaint (engineer only)
export function useResolveComplaint() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ResolveComplaintData) => {
      if (!db) throw new Error('Firebase not initialized');
      
      const docRef = doc(db, 'complaints', data.id);
      
      const updateData = {
        resolution_image_url: data.resolution_image_url,
        resolution_notes: data.resolution_notes,
        resolution_lat: data.resolution_lat,
        resolution_lng: data.resolution_lng,
        location_mismatch: data.location_mismatch,
        status: 'completed',
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        points_awarded: data.location_mismatch ? 5 : 10,
      };
      
      await updateDoc(docRef, updateData);
      
      const updatedDoc = await getDoc(docRef);
      return { id: updatedDoc.id, ...updatedDoc.data() } as Complaint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
  });
}

// Update complaint status (admin only)
export function useUpdateComplaintStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Complaint['status'] }) => {
      if (!db) throw new Error('Firebase not initialized');
      
      const docRef = doc(db, 'complaints', id);
      await updateDoc(docRef, { 
        status,
        updated_at: new Date().toISOString()
      });
      
      const updatedDoc = await getDoc(docRef);
      return { id: updatedDoc.id, ...updatedDoc.data() } as Complaint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
  });
}

// Upload image to storage - returns storage path (not public URL)
export async function uploadComplaintImage(
  file: Blob,
  userId: string,
  type: 'complaint' | 'resolution'
): Promise<string> {
  const fileName = `complaints/${userId}/${type}_${Date.now()}.jpg`;
  return await uploadToStorage(file, fileName);
}

// Calculate distance between two GPS coordinates in meters
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
