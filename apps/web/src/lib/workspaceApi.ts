import { WorkspaceFiles } from '@repo/shared';
import { filesAndFoldersToPayload, payloadToFilesAndFolders } from './workspaceFs';
import { DEFAULT_FILES } from './defaultProject';
import { backendFetch } from './apiClient';

export const DEFAULT_PROJECT_ID = 'default';

export type WorkspaceEntryDto = {
  path: string;
  content: string;
  kind: 'file' | 'folder';
};

export async function fetchWorkspace(
  projectId = DEFAULT_PROJECT_ID,
  token?: string | null,
): Promise<{
  files: WorkspaceFiles;
  folders: string[];
} | null> {
  try {
    const res = await backendFetch(`/workspace/${projectId}`, {
      token,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { entries: WorkspaceEntryDto[] };
    if (!Array.isArray(data.entries)) return null;

    const remote = payloadToFilesAndFolders(data.entries);
    const bootstrap = getBootstrapWorkspace();

    return {
      files: { ...bootstrap.files, ...remote.files },
      folders: [...new Set([...bootstrap.folders, ...remote.folders])],
    };
  } catch {
    return null;
  }
}

export async function saveWorkspace(
  files: WorkspaceFiles,
  folders: string[],
  projectId = DEFAULT_PROJECT_ID,
  token?: string | null,
): Promise<boolean> {
  try {
    const res = await backendFetch(`/workspace/${projectId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ entries: filesAndFoldersToPayload(files, folders) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function createFolderApi(
  folderPath: string,
  projectId = DEFAULT_PROJECT_ID,
  token?: string | null,
): Promise<boolean> {
  try {
    const res = await backendFetch(`/workspace/${projectId}/folders`, {
      method: 'POST',
      token,
      body: JSON.stringify({ path: folderPath }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function getBootstrapWorkspace(): { files: WorkspaceFiles; folders: string[] } {
  return { files: DEFAULT_FILES, folders: [] };
}
