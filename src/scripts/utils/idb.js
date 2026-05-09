/* ================================================================
   IndexedDB helper — Kisah
   Stores:
     - saved_stories : bookmarked stories (create, read, delete)
     - pending_stories: offline queue for background sync
================================================================ */

const DB_NAME    = 'kisah-db';
const DB_VERSION = 2;

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('saved_stories')) {
        const store = db.createObjectStore('saved_stories', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('name',      'name',      { unique: false });
      }
      if (!db.objectStoreNames.contains('pending_stories')) {
        db.createObjectStore('pending_stories', { keyPath: 'localId', autoIncrement: true });
      }
    };

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = (e) => reject(e.target.error);
  });
}

/* ---- Saved Stories ---- */
export async function saveStory(story) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction('saved_stories', 'readwrite');
    const store = tx.objectStore('saved_stories');
    const req   = store.put({ ...story, savedAt: new Date().toISOString() });
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function getSavedStories() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction('saved_stories', 'readonly');
    const store = tx.objectStore('saved_stories');
    const req   = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function getSavedStoryById(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction('saved_stories', 'readonly');
    const req   = tx.objectStore('saved_stories').get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function deleteSavedStory(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('saved_stories', 'readwrite');
    const req = tx.objectStore('saved_stories').delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function isStorySaved(id) {
  const story = await getSavedStoryById(id);
  return !!story;
}

/* ---- Pending Stories (offline sync) ---- */
export async function addPendingStory(data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('pending_stories', 'readwrite');
    const req = tx.objectStore('pending_stories').add({ ...data, createdAt: new Date().toISOString() });
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function getPendingStories() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction('pending_stories', 'readonly');
    const req   = tx.objectStore('pending_stories').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function deletePendingStory(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('pending_stories', 'readwrite');
    const req = tx.objectStore('pending_stories').delete(localId);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}
