import Dexie from 'dexie';

export const db = new Dexie('AgriDataLocal');
db.version(1).stores({
  farmerImages: 'id, blob' // 'id' will match the Farmer ID from your backend
});