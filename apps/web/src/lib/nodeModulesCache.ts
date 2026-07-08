/**
 * nodeModulesCache.ts
 *
 * IndexedDB cache for WebContainer node_modules binary snapshots.
 * Keyed by projectId + package.json hash.
 *
 * Why IndexedDB instead of localStorage?
 *   - localStorage is limited to ~5 MB.
 *   - A node_modules snapshot for a Next.js project is ~15–60 MB (binary tarball).
 *   - IndexedDB handles binary blobs of hundreds of MB.
 */

const DB_NAME = 'aura-wc-node-modules';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

/** Max size we are willing to store (200 MB). Larger projects skip caching. */
const MAX_SNAPSHOT_BYTES = 200 * 1024 * 1024;

interface SnapshotRecord {
  key: string;          // `${projectId}::${pkgHash}`
  projectId: string;
  pkgHash: string;
  data: Uint8Array;
  savedAt: number;      // Date.now()
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function storeKey(projectId: string, pkgHash: string): string {
  return `${projectId}::${pkgHash}`;
}

/**
 * Persist a node_modules snapshot for a project.
 * Silently no-ops if the snapshot exceeds MAX_SNAPSHOT_BYTES.
 */
export async function saveSnapshot(
  projectId: string,
  pkgHash: string,
  data: Uint8Array,
): Promise<void> {
  if (data.byteLength > MAX_SNAPSHOT_BYTES) {
    console.warn(
      `[nodeModulesCache] Snapshot too large (${(data.byteLength / 1024 / 1024).toFixed(1)} MB) — skipping cache.`,
    );
    return;
  }

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const record: SnapshotRecord = {
        key: storeKey(projectId, pkgHash),
        projectId,
        pkgHash,
        data,
        savedAt: Date.now(),
      };
      const req = tx.objectStore(STORE_NAME).put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
    console.info(
      `[nodeModulesCache] Saved snapshot (${(data.byteLength / 1024 / 1024).toFixed(1)} MB) for project ${projectId}.`,
    );
  } catch (err) {
    console.warn('[nodeModulesCache] Failed to save snapshot:', err);
  }
}

/**
 * Load a cached node_modules snapshot.
 * Returns null if nothing is cached or if the hash doesn't match.
 */
export async function loadSnapshot(
  projectId: string,
  pkgHash: string,
): Promise<Uint8Array | null> {
  try {
    const db = await openDb();
    const result = await new Promise<SnapshotRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(storeKey(projectId, pkgHash));
      req.onsuccess = () => resolve(req.result as SnapshotRecord | undefined);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
    return result?.data ?? null;
  } catch (err) {
    console.warn('[nodeModulesCache] Failed to load snapshot:', err);
    return null;
  }
}

/**
 * Delete all cached snapshots for a project (e.g. when package.json changes).
 */
export async function deleteProjectSnapshots(projectId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) { resolve(); return; }
        const record = cursor.value as SnapshotRecord;
        if (record.projectId === projectId) cursor.delete();
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => { db.close(); resolve(); };
    });
  } catch (err) {
    console.warn('[nodeModulesCache] Failed to delete snapshots:', err);
  }
}
