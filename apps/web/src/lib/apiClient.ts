/** NestJS backend base URL (default port 3003, with api/v1 prefix). */
export function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3003/api/v1';
}

export async function backendFetch(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<Response> {
  const { token, ...rest } = init ?? {};
  const headers = new Headers(rest.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (rest.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${getBackendUrl()}${path}`, {
    ...rest,
    headers,
  });
}
