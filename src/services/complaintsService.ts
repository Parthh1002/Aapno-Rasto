import { db } from '@/lib/firebaseConfig';
import { collection, query, where, getDocs, orderBy, doc, getDoc, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { uploadToStorage } from '@/lib/storage';

export interface ComplaintData {
  category: string;
  sub_category?: string;
  description: string;
  lat: number;
  lng: number;
  address?: string;
  image_url: string;
  urgency?: 'low' | 'medium' | 'high';
}

export interface ComplaintRow {
  id: string;
  user_id: string;
  category: string;
  sub_category: string | null;
  description: string;
  lat: number;
  lng: number;
  address: string | null;
  status: string;
  urgency: string | null;
  image_url: string;
  assigned_to: string | null;
  resolution_image_url: string | null;
  resolution_notes: string | null;
  resolution_photos: string[] | null;
  location_mismatch: boolean | null;
  points_awarded: number | null;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
  is_duplicate: boolean | null;
  duplicate_type: string | null;
  master_issue_id: string | null;
  match_confidence: number | null;
  matched_against_issue_id: string | null;
  match_reason: string[] | null;
  image_hash: string | null;
}

import { supabase } from '@/lib/supabase';

export async function uploadComplaintImage(
  imageDataUrl: string,
  userId: string
): Promise<string> {
  const response = await fetch(imageDataUrl);
  const blob = await response.blob();
  const fileName = `${userId}_${Date.now()}.jpg`;

  // Assume the user has a "complaints" bucket in Supabase.
  // If it doesn't exist, this will fail, but Supabase doesn't require a card to create one!
  const { error } = await supabase.storage
    .from('complaints')
    .upload(fileName, blob, { contentType: 'image/jpeg' });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error('Failed to upload image to Supabase');
  }

  // Get the public URL to save in Firestore
  const { data: { publicUrl } } = supabase.storage
    .from('complaints')
    .getPublicUrl(fileName);

  return publicUrl;
}

export async function createComplaint(
  data: ComplaintData,
  userId: string
): Promise<ComplaintRow> {
  if (!db) throw new Error('Firebase not initialized');
  const complaintData = {
    ...data,
    user_id: userId,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  // Firebase does not allow undefined values, convert them to null
  Object.keys(complaintData).forEach((key) => {
    if ((complaintData as any)[key] === undefined) {
      (complaintData as any)[key] = null;
    }
  });

  const docRef = await addDoc(collection(db, 'complaints'), complaintData);
  return { id: docRef.id, ...complaintData } as ComplaintRow;
}

export async function fetchAllComplaints(): Promise<ComplaintRow[]> {
  if (!db) return [];
  const q = query(collection(db, 'complaints'), orderBy('created_at', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ComplaintRow));
}

export async function fetchUserComplaints(userId: string): Promise<ComplaintRow[]> {
  if (!db) return [];
  const q = query(
    collection(db, 'complaints'),
    where('user_id', '==', userId),
    orderBy('created_at', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ComplaintRow));
}

export async function updateComplaintStatus(
  complaintId: string,
  status: 'pending' | 'in_progress' | 'completed' | 'rejected',
  urgency?: 'high' | 'medium' | 'low'
): Promise<ComplaintRow> {
  if (!db) throw new Error('Firebase not initialized');
  const updateData: any = { status };
  if (urgency) updateData.urgency = urgency;
  if (status === 'completed') {
    updateData.resolved_at = new Date().toISOString();
    updateData.points_awarded = 10;
  }
  const docRef = doc(db, 'complaints', complaintId);
  await updateDoc(docRef, updateData);
  const snap = await getDoc(docRef);
  return { id: snap.id, ...snap.data() } as ComplaintRow;
}

export async function assignComplaint(
  complaintId: string,
  engineerId: string
): Promise<ComplaintRow> {
  if (!db) throw new Error('Firebase not initialized');
  const docRef = doc(db, 'complaints', complaintId);
  await updateDoc(docRef, { assigned_to: engineerId, status: 'in_progress' });
  const snap = await getDoc(docRef);
  return { id: snap.id, ...snap.data() } as ComplaintRow;
}

export function subscribeToComplaints(
  onInsert: (complaint: ComplaintRow) => void,
  onUpdate: (complaint: ComplaintRow) => void,
  onDelete: (complaintId: string) => void
) {
  if (!db) return () => {};
  const q = query(collection(db, 'complaints'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const data = { id: change.doc.id, ...change.doc.data() } as ComplaintRow;
      if (change.type === 'added') onInsert(data);
      if (change.type === 'modified') onUpdate(data);
      if (change.type === 'removed') onDelete(change.doc.id);
    });
  });
  return unsubscribe;
}

export function subscribeToUserComplaints(
  userId: string,
  onInsert: (complaint: ComplaintRow) => void,
  onUpdate: (complaint: ComplaintRow) => void
) {
  if (!db) return () => {};
  const q = query(collection(db, 'complaints'), where('user_id', '==', userId));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const data = { id: change.doc.id, ...change.doc.data() } as ComplaintRow;
      if (change.type === 'added') onInsert(data);
      if (change.type === 'modified') onUpdate(data);
    });
  });
  return unsubscribe;
}
