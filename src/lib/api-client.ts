/**
 * The frontend's only way to talk to the backend.
 *   const data = await api.get<MembersResponse>("/api/members?status=ACTIVE");
 *   await api.post("/api/attendance", { memberId });
 * Errors from the server are thrown as ApiClientError with a readable message.
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    /** For 400s from form validation: { fieldName: "what's wrong" } */
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** The per-field messages of a failed save, if the server sent any. */
export function fieldErrors(err: unknown): Record<string, string> {
  return err instanceof ApiClientError ? err.fields : {};
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
  });

  if (res.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/auth/login")) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new ApiClientError("Session expired", 401);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiClientError(data?.error ?? `Request failed (${res.status})`, res.status, data?.fields ?? {});
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body ?? {}),
  put: <T>(url: string, body: unknown) => request<T>("PUT", url, body),
  patch: <T>(url: string, body: unknown) => request<T>("PATCH", url, body),
  del: <T>(url: string) => request<T>("DELETE", url),
};

/** Build "/api/x?a=1&b=2", skipping empty values */
export function withQuery(path: string, params: Record<string, string | number | null | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}
