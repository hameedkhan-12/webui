/**
 * nodeModulesCache.ts
 *
 * IndexedDB cache for WebContainer node_modules binary snapshots.
 * Keyed by projectId + package.json hash.
 *
 * Why IndexedDB instead of localStorage?
 *   - localStorage is limited to ~5 MB.
 *   - A node_modules snapshot for a Next.js project is commonly 300-600 MB
 *     (Next.js's own SWC binaries alone are large). IndexedDB comfortably
 *     handles binary blobs in that range.
 *
 * IMPORTANT: every operation here resolves/rejects on the *transaction's*
 * oncomplete/onerror/onabort, never on the individual request's onsuccess.
 * A request's onsuccess only means "queued into the transaction" — it does
 * NOT mean the data committed to disk. For large blobs, the request can
 * report success and the transaction can still fail to commit afterward
 * (quota checks, structured-clone serialization of a big Uint8Array), and
 * that failure is invisible unless you're listening on the transaction
 * itself. This is exactly what caused snapshot saves to log "success" while
 * nothing actually persisted.
 */

const DB_NAME = 'aura-wc-node-modules';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

/**
 * Max size we are willing to store. Raised from 200 MB to 800 MB — the
 * previous cap was silently rejecting every real Next.js node_modules
 * snapshot (typically 300-600 MB).
 */
const MAX_SNAPSHOT_BYTES = 800 * 1024 * 1024;

interface SnapshotRecord {
  key: string;          // `${projectId}::${pkgHash}`
  projectId: string;
  pkgHash: string;
  data: Uint8Array;
  savedAt: number;      // Date.now()
}

/** Result of a save attempt, so callers can surface skips/failures in their
 * own UI instead of only console.warn. */
export type SaveSnapshotResult =
  | { status: 'saved'; sizeBytes: number }
  | { status: 'too_large'; sizeBytes: number; maxBytes: number }
  | { status: 'error'; error: unknown };

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
 * Resolves only once the write transaction has actually committed.
 */
export async function saveSnapshot(
  projectId: string,
  pkgHash: string,
  data: Uint8Array,
): Promise<SaveSnapshotResult> {
  if (data.byteLength > MAX_SNAPSHOT_BYTES) {
    console.warn(
      `[nodeModulesCache] Snapshot too large (${(data.byteLength / 1024 / 1024).toFixed(1)} MB) — skipping cache.`,
    );
    return { status: 'too_large', sizeBytes: data.byteLength, maxBytes: MAX_SNAPSHOT_BYTES };
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

      tx.objectStore(STORE_NAME).put(record);

      // Resolve/reject on the TRANSACTION, not the individual put() request.
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.onabort = () => {
        db.close();
        reject(tx.error ?? new Error('IndexedDB transaction aborted while saving snapshot'));
      };
    });

    console.info(
      `[nodeModulesCache] Saved snapshot (${(data.byteLength / 1024 / 1024).toFixed(1)} MB) for project ${projectId}.`,
    );
    return { status: 'saved', sizeBytes: data.byteLength };
  } catch (err) {
    console.warn('[nodeModulesCache] Failed to save snapshot:', err);
    return { status: 'error', error: err };
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
      const getReq = tx.objectStore(STORE_NAME).get(storeKey(projectId, pkgHash));
      let value: SnapshotRecord | undefined;

      getReq.onsuccess = () => {
        // Capture the value here — it's available as soon as the request
        // succeeds — but we still wait for tx.oncomplete before resolving,
        // so a read-transaction failure (e.g. the DB closing mid-read)
        // surfaces as a rejection instead of returning a partial result.
        value = getReq.result as SnapshotRecord | undefined;
      };
      getReq.onerror = () => reject(getReq.error);

      tx.oncomplete = () => { db.close(); resolve(value); };
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.onabort = () => {
        db.close();
        reject(tx.error ?? new Error('IndexedDB transaction aborted while loading snapshot'));
      };
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
      const cursorReq = store.openCursor();

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) return; // no more records — wait for tx.oncomplete below
        const record = cursor.value as SnapshotRecord;
        if (record.projectId === projectId) cursor.delete();
        cursor.continue();
      };
      cursorReq.onerror = () => reject(cursorReq.error);

      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.onabort = () => {
        db.close();
        reject(tx.error ?? new Error('IndexedDB transaction aborted while deleting snapshots'));
      };
    });
  } catch (err) {
    console.warn('[nodeModulesCache] Failed to delete snapshots:', err);
  }
}