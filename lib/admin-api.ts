// Typed client for the admin API plane. Browser-only fetch wrappers; the
// backend re-validates everything server-side regardless of what the UI
// sends. Secrets (temp passwords) live in component state only — never in
// localStorage, never in URLs.
export type ApiError = {
  status: number;
  error: string;
  code?: string;
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      error: body.error ?? `Request failed (${res.status}).`,
      code: body.code,
    };
    throw err;
  }
  return body as T;
}

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department: string | null;
  siteIds: string[];
  emailVerified: boolean;
  mustChangePassword: boolean;
  createdAt: string;
};

export type AdminSite = {
  id: string;
  code: string;
  name: string;
};

export type UsersList = {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
};

export function buildUsersQuery(params: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): string {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.role && params.role !== "all") query.set("role", params.role);
  if (params.status && params.status !== "all") query.set("status", params.status);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 10));
  return `/api/admin/users?${query.toString()}`;
}
