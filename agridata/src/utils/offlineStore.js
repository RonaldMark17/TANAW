// src/utils/offlineStore.js

const QUEUE_KEY = 'TANAW_sync_queue';

export const offlineStore = {
  // --- DYNAMIC CACHING FOR ANY PAGE ---
  // key can be: 'farmers', 'products', 'surveys', 'groups', etc.
  saveData: (key, data) => {
    localStorage.setItem(`TANAW_cache_${key}`, JSON.stringify(data));
    localStorage.setItem(`TANAW_cache_${key}_time`, new Date().toISOString());
  },

  getCachedData: (key) => {
    const data = localStorage.getItem(`TANAW_cache_${key}`);
    return data ? JSON.parse(data) : [];
  },

  // --- UNIVERSAL SYNC QUEUE ---
  // type can be: 'CREATE_FARMER', 'CREATE_PRODUCT', 'UPDATE_SURVEY', etc.
  addToQueue: (data, type, moduleName) => {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push({ 
      id: Date.now(), 
      data, 
      type, 
      module: moduleName, // Tells the sync engine which API to use
      timestamp: new Date().toISOString() 
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  getQueue: () => JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'),
  
  removeFromQueue: (id) => {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    const filtered = queue.filter(item => item.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  },

  clearQueue: () => localStorage.removeItem(QUEUE_KEY)
};