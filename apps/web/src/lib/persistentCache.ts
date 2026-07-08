/**
 * Persistent cache for WebContainer state
 * Stores package.json hashes and install status using localStorage.
 * Keys are per-project so switching projects doesn't evict install state.
 */

const CACHE_PREFIX = 'webcontainer_cache_';

function cacheKey(projectId: string, suffix: string) {
  return `${CACHE_PREFIX}${projectId}_${suffix}`;
}

interface CacheState {
  packageJsonHash: string;
  isInstalled: boolean;
  projectId: string;
  timestamp: number;
}

/**
 * Get cached installation state for a specific project
 */
export function getCachedInstallState(projectId: string): { hash: string; isInstalled: boolean } | null {
  try {
    const hash = localStorage.getItem(cacheKey(projectId, 'pkg_hash'));
    const isInstalled = localStorage.getItem(cacheKey(projectId, 'install_status')) === 'true';
    if (hash && isInstalled) {
      return { hash, isInstalled: true };
    }
  } catch (e) {
    console.warn('Failed to read from localStorage:', e);
  }
  return null;
}

/**
 * Save installation state to cache for a specific project
 */
export function cacheInstallState(
  packageJsonHash: string,
  isInstalled: boolean,
  projectId: string
): void {
  try {
    localStorage.setItem(cacheKey(projectId, 'pkg_hash'), packageJsonHash);
    localStorage.setItem(cacheKey(projectId, 'install_status'), String(isInstalled));
  } catch (e) {
    console.warn('Failed to write to localStorage:', e);
  }
}

/**
 * Clear installation cache for a specific project
 */
export function clearInstallCache(projectId?: string): void {
  try {
    if (projectId) {
      localStorage.removeItem(cacheKey(projectId, 'pkg_hash'));
      localStorage.removeItem(cacheKey(projectId, 'install_status'));
    } else {
      // Clear all project caches (legacy clean-up)
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
      keys.forEach((k) => localStorage.removeItem(k));
    }
  } catch (e) {
    console.warn('Failed to clear localStorage:', e);
  }
}

/**
 * Check if package.json hash matches cached hash for a project
 */
export function hasPackageJsonChanged(newHash: string, projectId: string): boolean {
  const cached = getCachedInstallState(projectId);
  return !cached || cached.hash !== newHash;
}
