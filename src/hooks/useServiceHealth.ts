import { useEffect, useState } from 'react';
import {
  getServiceHealthManager,
  type ServiceHealthSnapshot,
} from '../services/service-health';
import { getMutationQueue, type QueueChange } from '../services/offline-queue';

const EMPTY_COUNTS: QueueChange = { pending: 0, failed: 0, blocked: 0, syncing: 0 };

/**
 * Subscribe to cloud health and offline-queue counts. This is the only way
 * UI components should learn about outages — never from raw errors.
 */
export function useServiceHealth(): {
  snapshot: ServiceHealthSnapshot;
  queueCounts: QueueChange;
} {
  const [snapshot, setSnapshot] = useState<ServiceHealthSnapshot>(() =>
    getServiceHealthManager().getSnapshot(),
  );
  const [queueCounts, setQueueCounts] = useState<QueueChange>(EMPTY_COUNTS);

  useEffect(() => {
    const manager = getServiceHealthManager();
    const queue = getMutationQueue();
    const unsubscribeHealth = manager.subscribe(setSnapshot);
    const unsubscribeQueue = queue.subscribe(setQueueCounts);
    setSnapshot(manager.getSnapshot());
    void queue.counts().then(setQueueCounts);
    return () => {
      unsubscribeHealth();
      unsubscribeQueue();
    };
  }, []);

  return { snapshot, queueCounts };
}
