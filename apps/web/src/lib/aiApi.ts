import { WorkspaceFiles } from '@repo/shared';
import { filesAndFoldersToPayload } from './workspaceFs';
import { DEFAULT_PROJECT_ID } from './workspaceApi';
import { backendFetch } from './apiClient';

export type AiGenerationResult = {
  message: string;
  statusLogs: string[];
  fileUpdates: Record<string, string>;
};

export type AiJobResponse = {
  jobId: string;
  status: string;
  error?: string | null;
  result?: AiGenerationResult | null;
};

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

export async function getAiJob(jobId: string, token?: string | null): Promise<AiJobResponse | null> {
  try {
    const res = await backendFetch(`/ai/jobs/${jobId}`, { token, cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as AiJobResponse;
  } catch {
    return null;
  }
}

export async function pollAiJob(
  jobId: string,
  onProgress?: (job: AiJobResponse) => void,
  tokenOrGetter?: string | null | (() => Promise<string | null>),
  maxAttempts = 90,
  intervalMs = 2000,
  checkCancelled?: () => boolean,
): Promise<AiJobResponse | null> {
  for (let i = 0; i < maxAttempts; i++) {
    if (checkCancelled?.()) {
      return null;
    }

    // Refresh the token on every poll so expired JWTs never block a long generation
    const token =
      typeof tokenOrGetter === 'function' ? await tokenOrGetter() : tokenOrGetter;

    const job = await getAiJob(jobId, token);
    if (!job) return null;

    if (checkCancelled?.()) {
      return null;
    }

    onProgress?.(job);

    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return null;
}

export async function cancelAiJob(
  jobId: string,
  token?: string | null,
): Promise<boolean> {
  try {
    const res = await backendFetch(`/ai/jobs/${jobId}/cancel`, {
      method: 'POST',
      token,
    });
    return res.ok;
  } catch (error) {
    console.error('[cancelAiJob] Error:', error);
    return false;
  }
}

