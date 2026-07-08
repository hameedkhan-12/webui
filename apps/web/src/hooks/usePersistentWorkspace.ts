/**
 * Hook for persisting workspace files to localStorage
 * Handles serialization and deserialization of file structure
 */

import { useState, useCallback, useRef } from 'react';

const WORKSPACE_STORAGE_PREFIX = 'workspace_files_';

export interface SerializedWorkspace {
  version: number;
  projectId: string;
  files: Record<string, { content: string; type: string }>;
  timestamp: number;
}

/**
 * Save workspace files to persistent storage
 */
export function saveWorkspaceToStorage(
  projectId: string,
  files: Record<string, any>
): boolean {
  try {
    if (!projectId) return false;

    const workspace: SerializedWorkspace = {
      version: 1,
      projectId,
      files: Object.entries(files).reduce(
        (acc, [path, file]) => {
          if (file && typeof file === 'object' && 'content' in file) {
            acc[path] = {
              content: file.content || '',
              type: file.type || 'file',
            };
          }
          return acc;
        },
        {} as Record<string, { content: string; type: string }>
      ),
      timestamp: Date.now(),
    };

    const key = `${WORKSPACE_STORAGE_PREFIX}${projectId}`;
    const serialized = JSON.stringify(workspace);

    // Check size before storing
    if (serialized.length > 5 * 1024 * 1024) {
      // 5MB limit - fallback to smaller subset
      console.warn('Workspace too large for localStorage, storing partial data');
      return false;
    }

    localStorage.setItem(key, serialized);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.code === 22) {
      // QuotaExceededError
      console.warn('localStorage quota exceeded');
    } else {
      console.warn('Failed to save workspace to storage:', e);
    }
    return false;
  }
}

/**
 * Load workspace files from persistent storage
 */
export function loadWorkspaceFromStorage(
  projectId: string
): Record<string, any> | null {
  try {
    if (!projectId) return null;

    const key = `${WORKSPACE_STORAGE_PREFIX}${projectId}`;
    const stored = localStorage.getItem(key);

    if (!stored) return null;

    const workspace: SerializedWorkspace = JSON.parse(stored);

    // Validate version
    if (workspace.version !== 1) {
      console.warn('Unsupported workspace version:', workspace.version);
      return null;
    }

    // Validate project ID matches
    if (workspace.projectId !== projectId) {
      console.warn('Project ID mismatch in stored workspace');
      return null;
    }

    // Reconstruct file objects
    const files = Object.entries(workspace.files).reduce(
      (acc, [path, file]) => {
        acc[path] = {
          content: file.content,
          type: file.type,
        };
        return acc;
      },
      {} as Record<string, any>
    );

    return files;
  } catch (e) {
    console.warn('Failed to load workspace from storage:', e);
    return null;
  }
}

/**
 * Clear stored workspace for a project
 */
export function clearStoredWorkspace(projectId: string): void {
  try {
    if (!projectId) return;
    const key = `${WORKSPACE_STORAGE_PREFIX}${projectId}`;
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('Failed to clear stored workspace:', e);
  }
}

/**
 * Get size of stored workspace in bytes
 */
export function getStoredWorkspaceSize(projectId: string): number {
  try {
    if (!projectId) return 0;
    const key = `${WORKSPACE_STORAGE_PREFIX}${projectId}`;
    const stored = localStorage.getItem(key);
    return stored ? new Blob([stored]).size : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Hook to manage persistent workspace storage
 */
export function usePersistentWorkspace(projectId: string) {
  const lastSaveRef = useRef<number>(0);

  const persistWorkspace = useCallback(
    (files: Record<string, any>) => {
      // Debounce saves to once per 5 seconds
      const now = Date.now();
      if (now - lastSaveRef.current < 5000) {
        return;
      }
      lastSaveRef.current = now;
      return saveWorkspaceToStorage(projectId, files);
    },
    [projectId]
  );

  const restoreWorkspace = useCallback(
    () => loadWorkspaceFromStorage(projectId),
    [projectId]
  );

  const clearWorkspace = useCallback(
    () => clearStoredWorkspace(projectId),
    [projectId]
  );

  return {
    persistWorkspace,
    restoreWorkspace,
    clearWorkspace,
  };
}
