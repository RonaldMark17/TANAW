// src/hooks/useAutoSync.js
import { useEffect, useState } from 'react';
import { offlineStore } from '../utils/offlineStore';
import { farmersAPI, productsAPI, surveysAPI, groupsAPI /* import all your APIs */ } from '../services/api';

export const useAutoSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const queue = offlineStore.getQueue();
      
      if (queue.length > 0 && !syncing) {
        setSyncing(true);
        console.log(`Connection restored. Syncing ${queue.length} items...`);
        
        for (const item of queue) {
          try {
            // Route the data to the correct API based on the module name
            if (item.module === 'farmers') await farmersAPI.create(item.data);
            if (item.module === 'products') await productsAPI.create(item.data);
            if (item.module === 'surveys') await surveysAPI.create(item.data);
            if (item.module === 'groups') await groupsAPI.create(item.data);
            // Add more modules as needed...

            // If successful, remove it from the offline queue
            offlineStore.removeFromQueue(item.id);
          } catch (err) {
            console.error(`Sync failed for ${item.module}:`, err);
          }
        }
        setSyncing(false);
      }
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Try syncing immediately when the app loads (if online)
    if (navigator.onLine) handleOnline();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncing]);

  return { isOnline, syncing };
};