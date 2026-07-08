import type {
  AIGenerateRequest,
  AIGenerateResponse,
  AIJobResponse,
  AISuggestionsRequest,
} from "@/types/ai.types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

async function apiFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || "Request failed");
  }

  return res.json() as Promise<T>;
}

export async function startAIGeneration(
  token: string,
  body: AIGenerateRequest,
): Promise<AIGenerateResponse> {
  return apiFetch<AIGenerateResponse>("/ai/generate", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getAIJobStatus(
  token: string,
  jobId: string,
): Promise<AIJobResponse> {
  return apiFetch<AIJobResponse>(`/ai/jobs/${jobId}`, token);
}

export async function getAISuggestions(
  token: string,
  body: AISuggestionsRequest,
): Promise<{ jobId: string; status: string; message: string }> {
  return apiFetch("/ai/suggestions", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
