import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  checkForDuplicates,
  getLinkedComplaints,
  mergeComplaints,
  unmergeComplaint,
  getMasterIssuesWithCounts,
  getDuplicateInfo,
  DuplicateCheckResult,
  LinkedComplaint
} from '@/services/duplicateDetectionService';

// Hook for checking duplicates on complaint submission
export function useCheckDuplicates() {
  const [isChecking, setIsChecking] = useState(false);

  const check = useCallback(async (
    complaintId: string,
    lat: number,
    lng: number,
    imageUrl: string,
    category: string,
    subCategory?: string
  ): Promise<DuplicateCheckResult> => {
    setIsChecking(true);
    try {
      return await checkForDuplicates(complaintId, lat, lng, imageUrl, category, subCategory);
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { check, isChecking };
}

// Hook for fetching linked complaints under a master issue
export function useLinkedComplaints(masterIssueId: string | null) {
  return useQuery({
    queryKey: ['linked-complaints', masterIssueId],
    queryFn: () => masterIssueId ? getLinkedComplaints(masterIssueId) : Promise.resolve([]),
    enabled: !!masterIssueId,
  });
}

// Hook for fetching master issues with duplicate counts
export function useMasterIssues() {
  return useQuery({
    queryKey: ['master-issues'],
    queryFn: getMasterIssuesWithCounts,
  });
}

// Hook for fetching duplicate info for a specific complaint
export function useDuplicateInfo(complaintId: string | null) {
  return useQuery({
    queryKey: ['duplicate-info', complaintId],
    queryFn: () => complaintId ? getDuplicateInfo(complaintId) : Promise.resolve(null),
    enabled: !!complaintId,
  });
}

// Hook for admin merge/unmerge actions
export function useDuplicateActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mergeMutation = useMutation({
    mutationFn: ({ masterIssueId, duplicateIds }: { masterIssueId: string; duplicateIds: string[] }) =>
      mergeComplaints(masterIssueId, duplicateIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['master-issues'] });
      queryClient.invalidateQueries({ queryKey: ['linked-complaints'] });
      toast({
        title: '✅ Complaints Merged',
        description: 'Selected complaints have been grouped under the master issue.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to merge complaints',
        variant: 'destructive',
      });
      console.error('Merge error:', error);
    },
  });

  const unmergeMutation = useMutation({
    mutationFn: (complaintId: string) => unmergeComplaint(complaintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['master-issues'] });
      queryClient.invalidateQueries({ queryKey: ['linked-complaints'] });
      toast({
        title: '✅ Complaint Unmerged',
        description: 'The complaint has been separated from its master issue.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to unmerge complaint',
        variant: 'destructive',
      });
      console.error('Unmerge error:', error);
    },
  });

  return {
    merge: mergeMutation.mutate,
    unmerge: unmergeMutation.mutate,
    isMerging: mergeMutation.isPending,
    isUnmerging: unmergeMutation.isPending,
  };
}

// Extended complaint type with duplicate fields
export interface ComplaintWithDuplicateInfo {
  id: string;
  category: string;
  sub_category: string | null;
  description: string;
  lat: number;
  lng: number;
  address: string | null;
  status: string | null;
  urgency: string | null;
  image_url: string;
  created_at: string | null;
  updated_at: string | null;
  resolved_at: string | null;
  user_id: string;
  assigned_to: string | null;
  points_awarded: number | null;
  // Duplicate detection fields
  is_duplicate: boolean | null;
  duplicate_type: string | null;
  master_issue_id: string | null;
  match_confidence: number | null;
  matched_against_issue_id: string | null;
  match_reason: string[] | null;
  image_hash: string | null;
}

// Helper to get duplicate badge text
export function getDuplicateBadgeText(complaint: ComplaintWithDuplicateInfo): string | null {
  if (complaint.is_duplicate && complaint.duplicate_type) {
    return complaint.duplicate_type === 'exact' 
      ? `Exact Duplicate (${complaint.match_confidence}%)` 
      : `Similar (${complaint.match_confidence}%)`;
  }
  return null;
}

// Helper to check if complaint is a master with duplicates
export function isMasterWithDuplicates(complaint: ComplaintWithDuplicateInfo, allComplaints: ComplaintWithDuplicateInfo[]): boolean {
  if (complaint.is_duplicate) return false;
  return allComplaints.some(c => c.master_issue_id === complaint.id);
}

// Helper to count duplicates for a master issue
export function countDuplicates(masterId: string, allComplaints: ComplaintWithDuplicateInfo[]): number {
  return allComplaints.filter(c => c.master_issue_id === masterId).length;
}
