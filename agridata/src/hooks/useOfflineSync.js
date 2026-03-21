import { useEffect, useState } from 'react';
import { offlineStore } from '../utils/offlineStore';
import { experiencesAPI } from '../services/api';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const queue = offlineStore.getQueue();
      
      if (queue.length > 0) {
        console.log("Connection restored. Syncing " + queue.length + " records...");
        
        for (const item of queue) {
          try {
            if (item.type === 'CREATE_EXPERIENCE') {
              await experiencesAPI.create(item.data);
            }
            // Remove from queue after success
            const currentQueue = offlineStore.getQueue();
            const filtered = currentQueue.filter(q => q.id !== item.id);
            localStorage.setItem('TANAW_sync_queue', JSON.stringify(filtered));
          } catch (err) {
            console.error("Sync failed for item:", item.id);
          }
        }
      }
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};