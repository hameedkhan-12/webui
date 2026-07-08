import { backendFetch } from './apiClient';

export interface ProjectDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  thumbnail?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { versions: number };
}

export async function fetchProjects(token?: string | null): Promise<ProjectDto[]> {
  try {
    const res = await backendFetch('/projects', { token, cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as ProjectDto[];
  } catch {
    return [];
  }
}

export async function createProject(
  name: string,
  token?: string | null,
): Promise<ProjectDto | null> {
  try {
    const res = await backendFetch('/projects', {
      method: 'POST',
      token,
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    return (await res.json()) as ProjectDto;
  } catch {
    return null;
  }
}

export async function deleteProject(id: string, token?: string | null): Promise<boolean> {
  try {
    const res = await backendFetch(`/projects/${id}`, { method: 'DELETE', token });
    return res.ok;
  } catch {
    return false;
  }
}

export async function duplicateProject(
  id: string,
  token?: string | null,
): Promise<ProjectDto | null> {
  try {
    const res = await backendFetch(`/projects/${id}/duplicate`, { method: 'POST', token });
    if (!res.ok) return null;
    return (await res.json()) as ProjectDto;
  } catch {
    return null;
  }
}

export async function fetchProjectById(
  id: string,
  token?: string | null,
): Promise<ProjectDto | null> {
  try {
    const res = await backendFetch(`/projects/${id}`, { token, cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as ProjectDto;
  } catch {
    return null;
  }
}
