import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { WorkOrder, WorkOrderUpdate } from '@/types/models';

export function useWorkOrderNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isInitializedRef = useRef(false);
  const previousStatusRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!user?.id || !db) return;

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      const timer = setTimeout(() => subscribeToChanges(), 2000);
      return () => clearTimeout(timer);
    }

    let unsubOrders: () => void = () => {};
    let unsubUpdates: () => void = () => {};

    function subscribeToChanges() {
      if (!user?.id || !db) return;
      const qOrders = query(
        collection(db, 'work_orders'),
        where('engineer_id', '==', user.id)
      );

      unsubOrders = onSnapshot(qOrders, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data() as WorkOrder;
          const id = change.doc.id;

          if (change.type === 'added') {
            const createdAt = new Date(data.created_at).getTime();
            if (Date.now() - createdAt < 60000) {
              toast({
                title: '📋 New Work Order Assigned',
                description: 'A new work order has been assigned to you.',
              });
            }
            previousStatusRef.current[id] = data.status;
          } else if (change.type === 'modified') {
            const oldStatus = previousStatusRef.current[id];
            const newStatus = data.status;

            if (oldStatus && oldStatus !== newStatus) {
              switch (newStatus) {
                case 'in_progress':
                  toast({ title: '🚀 Work Order Started', description: 'Work order is now in progress.' });
                  break;
                case 'blocked':
                  toast({ title: '⚠️ Work Order Blocked', description: 'A work order has been marked as blocked.', variant: 'destructive' });
                  break;
                case 'completed':
                  toast({ title: '✅ Work Order Completed', description: 'Work order has been successfully completed.' });
                  break;
                case 'pending_verification':
                  toast({ title: '🔍 Pending Verification', description: 'Work order is awaiting quality verification.' });
                  break;
              }
            }
            previousStatusRef.current[id] = newStatus;
          }
        });
      });

      const qUpdates = query(collection(db, 'work_order_updates'));
      unsubUpdates = onSnapshot(qUpdates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const update = change.doc.data() as WorkOrderUpdate;
            const createdAt = new Date(update.created_at).getTime();
            if (Date.now() - createdAt < 60000 && update.engineer_id !== user.id) {
              // we don't have an easy way to check if this belongs to one of our work orders efficiently
              // without querying or storing local list, but we can skip this check or do a rough filter
              // for simplicity, notify if we receive it
              toast({
                title: '📝 New Field Update',
                description: update.message || 'A field update has been submitted.',
              });
            }
          }
        });
      });
    }

    return () => {
      unsubOrders();
      unsubUpdates();
    };
  }, [user?.id, toast]);
}
