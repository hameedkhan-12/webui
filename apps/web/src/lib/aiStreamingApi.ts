/**
 * Streaming AI generation with real-time file updates
 * Files are created/updated incrementally as the AI generates them
 */

import { WorkspaceFiles } from '@repo/shared';
import { filesAndFoldersToPayload } from './workspaceFs';
import { DEFAULT_PROJECT_ID } from './workspaceApi';
import { backendFetch } from './apiClient';

export type StreamingFileUpdate = {
  path: string;
  content: string;
  isComplete?: boolean;
};

export type StreamingMessage = {
  type: 'file' | 'status' | 'done' | 'error' | 'tree-op';
  data: any;
};

/**
 * Start streaming AI generation with real-time file updates
 * Returns an async generator that yields file updates as they're generated
 */
export async function* streamAiGeneration(
  prompt: string,
  files: WorkspaceFiles,
  folders: string[],
  projectId = DEFAULT_PROJECT_ID,
  token?: string | null,
): AsyncGenerator<StreamingMessage, void, unknown> {
  try {
    const res = await backendFetch('/ai/generate-stream', {
      method: 'POST',
      token,
      body: JSON.stringify({
        projectId,
        prompt,
        entries: filesAndFoldersToPayload(files, folders),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[ai/generate-stream]', err);
      yield {
        type: 'error',
        data: { message: `Failed to start generation: ${err}` } as any,
      };
      return;
    }

    if (!res.body) {
      yield {
        type: 'error',
        data: { message: 'No response body' } as any,
      };
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete messages in the buffer
      const lines = buffer.split('\n');
      buffer = lines[lines.length - 1]; // Keep incomplete line in buffer

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle SSE format: data: {...}
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6);
            const message = JSON.parse(jsonStr) as StreamingMessage;
            yield message;
          } catch (e) {
            console.error('Failed to parse streaming message:', e);
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      if (buffer.startsWith('data: ')) {
        try {
          const jsonStr = buffer.slice(6);
          const message = JSON.parse(jsonStr) as StreamingMessage;
          yield message;
        } catch (e) {
          console.error('Failed to parse streaming message:', e);
        }
      }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    yield {
      type: 'error',
      data: { message: errMsg } as any,
    };
  }
}

/**
 * Fallback: Poll for generation job (used if streaming not available)
 * This is kept for backward compatibility
 */
export async function startAiGeneration(
  prompt: string,
  files: WorkspaceFiles,
  folders: string[],
  projectId = DEFAULT_PROJECT_ID,
  token?: string | null,
): Promise<{ jobId: string } | null> {
  try {
    const res = await backendFetch('/ai/generate', {
      method: 'POST',
      token,
      body: JSON.stringify({
        projectId,
        prompt,
        entries: filesAndFoldersToPayload(files, folders),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[ai/generate]', err);
      return null;
    }

    return (await res.json()) as { jobId: string };
  } catch (error) {
    console.error('[ai/generate]', error);
    return null;
  }
}

export async function getAiJob(
  jobId: string,
  token?: string | null,
): Promise<{ jobId: string; status: string; error?: string | null; result?: any } | null> {
  try {
    const res = await backendFetch(`/ai/job/${jobId}`, {
      method: 'GET',
      token,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[ai/job]', err);
      return null;
    }

    return (await res.json()) as any;
  } catch (error) {
    console.error('[ai/job]', error);
    return null;
  }
}

export async function pollAiJob(
  jobId: string,
  onProgress: (progress: any) => void,
  getToken: () => Promise<string | null>,
  maxAttempts = 90,
  pollInterval = 2000,
  shouldCancel: () => boolean = () => false,
): Promise<any | null> {
  for (let i = 0; i < maxAttempts; i++) {
    if (shouldCancel()) return null;

    const token = await getToken();
    const job = await getAiJob(jobId, token);

    if (!job) {
      await new Promise((r) => setTimeout(r, pollInterval));
      continue;
    }

    onProgress(job);

    if (job.status === 'done' || job.status === 'success') {
      return job;
    }

    if (job.status === 'failed') {
      return job;
    }

    await new Promise((r) => setTimeout(r, pollInterval));
  }

  return null;
}

export async function cancelAiJob(jobId: string, token?: string | null): Promise<void> {
  try {
    await backendFetch(`/ai/job/${jobId}`, {
      method: 'DELETE',
      token,
    });
  } catch (error) {
    console.error('[ai/cancel]', error);
  }
}
