import { collection, doc, getDocs, updateDoc, query, where, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { Complaint } from '@/types/models';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType: 'exact' | 'similar' | null;
  masterIssueId: string | null;
  matchConfidence: number;
  matchedAgainstIssueId: string | null;
  matchReason: string[];
}

export interface LinkedComplaint extends Complaint {}

// Check for duplicates when a new complaint is submitted
export async function checkForDuplicates(
  complaintId: string,
  lat: number,
  lng: number,
  imageUrl: string,
  category: string,
  subCategory?: string
): Promise<DuplicateCheckResult> {
  // Mocked for Firebase as we don't have the Cloud Function deployed yet.
  return {
    isDuplicate: false,
    duplicateType: null,
    masterIssueId: null,
    matchConfidence: 0,
    matchedAgainstIssueId: null,
    matchReason: []
  };
}

// Get all complaints linked to a master issue (for admin view)
export async function getLinkedComplaints(masterIssueId: string): Promise<LinkedComplaint[]> {
  if (!db) return [];
  const q = query(collection(db, 'complaints'), where('master_issue_id', '==', masterIssueId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LinkedComplaint));
}

// Admin action: Merge complaints under a master issue
export async function mergeComplaints(
  masterIssueId: string,
  duplicateIds: string[]
): Promise<void> {
  if (!db) return;
  for (const id of duplicateIds) {
    await updateDoc(doc(db, 'complaints', id), {
      is_duplicate: true,
      master_issue_id: masterIssueId,
      duplicate_type: 'exact',
    });
  }
}

// Admin action: Unmerge a complaint from its master
export async function unmergeComplaint(complaintId: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'complaints', complaintId), {
    is_duplicate: false,
    master_issue_id: null,
    duplicate_type: null,
    match_confidence: null,
    match_reason: null,
  });
}

// Get master issues with their duplicate counts (for admin dashboard)
export async function getMasterIssuesWithCounts(): Promise<{
  id: string;
  duplicateCount: number;
  category: string;
  description: string;
  status: string | null;
  created_at: string | null;
}[]> {
  if (!db) return [];
  const q = query(collection(db, 'complaints'), where('is_duplicate', '==', false), orderBy('created_at', 'desc'));
  const snapshot = await getDocs(q);
  
  const results = await Promise.all(
    snapshot.docs.map(async (d) => {
      const data = d.data();
      const dq = query(collection(db, 'complaints'), where('master_issue_id', '==', d.id));
      const dSnap = await getDocs(dq);
      return {
        id: d.id,
        category: data.category,
        description: data.description,
        status: data.status,
        created_at: data.created_at,
        duplicateCount: dSnap.size
      };
    })
  );
  
  return results.filter(r => r.duplicateCount > 0);
}

// Update complaint to mark as master issue (admin action)
export async function setAsMasterIssue(complaintId: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'complaints', complaintId), {
    is_duplicate: false,
    duplicate_type: null,
    master_issue_id: null
  });
}

// Get duplicate info for a specific complaint
export async function getDuplicateInfo(complaintId: string): Promise<{
  isDuplicate: boolean;
  duplicateType: string | null;
  masterIssueId: string | null;
  matchConfidence: number | null;
  matchReason: string[] | null;
  linkedCount: number;
} | null> {
  if (!db) return null;
  const docSnap = await getDoc(doc(db, 'complaints', complaintId));
  if (!docSnap.exists()) return null;
  
  const complaint = docSnap.data();
  let linkedCount = 0;
  
  if (!complaint.is_duplicate) {
    const dq = query(collection(db, 'complaints'), where('master_issue_id', '==', complaintId));
    const dSnap = await getDocs(dq);
    linkedCount = dSnap.size;
  }
  
  return {
    isDuplicate: complaint.is_duplicate || false,
    duplicateType: complaint.duplicate_type || null,
    masterIssueId: complaint.master_issue_id || null,
    matchConfidence: complaint.match_confidence || null,
    matchReason: complaint.match_reason || null,
    linkedCount
  };
}
