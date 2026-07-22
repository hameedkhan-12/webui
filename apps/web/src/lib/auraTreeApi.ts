import { backendFetch } from './apiClient';
import type { ContentNode } from '@aura/renderer';

export async function fetchContentTree(projectId: string, token?: string | null): Promise<ContentNode[] | null> {
  try {
    const res = await backendFetch(`/aura/tree/${projectId}`, {
      method: 'GET',
      token,
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.nodes || null;
  } catch (error) {
    console.error('[fetchContentTree] failed:', error);
    return null;
  }
}

export async function saveContentTree(projectId: string, nodes: readonly ContentNode[], token?: string | null): Promise<boolean> {
  try {
    const res = await backendFetch(`/aura/tree/${projectId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ nodes }),
    });
    return res.ok;
  } catch (error) {
    console.error('[saveContentTree] failed:', error);
    return false;
  }
}
