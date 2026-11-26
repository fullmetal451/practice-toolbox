const LIBRARY_KEY = 'practice-toolbox.loop.library.v1';
let database;

export function readLibrary() {
  try {
    const entries = JSON.parse(localStorage.getItem(LIBRARY_KEY));
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

export function writeLibrary(entries) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries));
}

async function audioDatabase() {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('practice-toolbox-loop', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('tracks');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await database;
  } catch (error) {
    database = undefined;
    throw error;
  }
}

export async function storedAudio(id, file) {
  const db = await audioDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('tracks', file === undefined ? 'readonly' : 'readwrite');
    const tracks = transaction.objectStore('tracks');
    const request = file === undefined ? tracks.get(id) : file === null ? tracks.delete(id) : tracks.put(file, id);
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error);
  });
}
