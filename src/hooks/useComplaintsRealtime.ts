import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Complaint } from '@/types/models';

export function useComplaintsRealtime() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // To keep track of old status to know what changed
  const previousComplaints = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!db) return;

    const q = query(collection(db, 'complaints'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Invalidate queries to refetch latest data
      queryClient.invalidateQueries({ queryKey: ['complaints'] });

      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data() as Complaint;
        const id = change.doc.id;
        
        if (change.type === 'added') {
          // Avoid spamming toasts for initial load by checking if it's new
          const createdAt = new Date(data.created_at).getTime();
          const now = Date.now();
          if (now - createdAt < 60000) { // Created within last minute
             toast({
               title: '📋 New Complaint Received',
               description: `A new ${data.category} complaint has been filed`,
             });
          }
          previousComplaints.current[id] = data.status;
        } 
        else if (change.type === 'modified') {
          const oldStatus = previousComplaints.current[id];
          const newStatus = data.status;
          
          if (oldStatus && newStatus !== oldStatus) {
            if (newStatus === 'completed') {
              const photos = data.resolution_photos;
              if (photos && photos.length > 0) {
                toast({
                  title: '✅ Complaint Resolved',
                  description: 'Your complaint has been resolved. Please see proof photos.',
                });
              }
            } else {
              toast({
                title: '🔄 Status Updated',
                description: `Complaint status changed to ${newStatus.replace('_', ' ')}`,
              });
            }
          }
          
          previousComplaints.current[id] = newStatus;
        }
      });
    });

    return () => unsubscribe();
  }, [queryClient, toast, user?.id]);
}

// Hook specifically for citizen notifications
export function useCitizenComplaintNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const previousStatus = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!user?.id || !db) return;

    const q = query(
      collection(db, 'complaints'),
      where('user_id', '==', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data() as Complaint;
        const id = change.doc.id;
        
        if (change.type === 'added') {
          previousStatus.current[id] = data.status;
        } else if (change.type === 'modified') {
          const oldStatus = previousStatus.current[id];
          const newStatus = data.status;
          const points = data.points_awarded || 10;
          
          if (oldStatus && newStatus !== oldStatus) {
            if (newStatus === 'completed') {
              toast({
                title: '🎉 Complaint Resolved!',
                description: data.resolution_photos?.length
                  ? `Your complaint has been resolved. See proof photos. +${points} points!`
                  : `Your complaint has been resolved. +${points} points!`,
              });
            } else if (newStatus === 'in_progress' && oldStatus === 'pending') {
              toast({
                title: '🔧 Work Started',
                description: 'An engineer has started working on your complaint.',
              });
            }
          }
          previousStatus.current[id] = newStatus;
        }
      });
    });

    return () => unsubscribe();
  }, [user?.id, toast]);
}
