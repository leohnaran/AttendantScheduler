const DB_NAME = 'AttendantSchedulerDB';
const STORE_NAME = 'ScheduleData';
const DATA_KEY = 'current_schedule';

/**
 * Opens the IndexedDB database.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // Bump version to clear old handle stores
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves the entire schedule state to IndexedDB.
 * @param {any} data 
 */
export async function saveToDatabase(data: any): Promise<void> {
  if (!data) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(data, DATA_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Database save failed:', err);
  }
}

/**
 * Loads the schedule state from IndexedDB.
 */
export async function loadFromDatabase(): Promise<any> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(DATA_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Database load failed:', err);
    return null;
  }
}

/**
 * Clears the database (Reset).
 */
export async function clearDatabase(): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(DATA_KEY);
    } catch (err) {
        console.error('Database clear failed:', err);
    }
}
