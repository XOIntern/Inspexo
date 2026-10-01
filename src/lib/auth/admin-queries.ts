// Admin read queries: list, detail, sites. Server-only.
//
// This is the DAL the future Admin Dashboard consumes — the UI talks HTTP,
// never imports this module or the database. All shapes are hash/secret
// free by construction (built field-by-field, never spread from rows).
import { or } from "@prisma/orm-postgres/orm-client";

import { db } from "@/src/prisma/db";

import { ProvisionError } from "./errors";

export const USER_LIST_DEFAULT_PAGE_SIZE = 20;
export const USER_LIST_MAX_PAGE_SIZE = 100;

export type AdminUserView = {
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

export type AdminUserDetails = AdminUserView & {
  sites: Array<{ id: string; code: string; name: string }>;
};

export type UserListQuery = {
  search?: string;
  role?: string;
  status?: string;
  siteId?: string;
  page?: number;
  pageSize?: number;
};

export type UserListResult = {
  users: AdminUserView[];
  total: number;
  page: number;
  pageSize: number;
};

function baseUsers() {
  return db.orm.public.User;
}

type UserCollection = ReturnType<typeof baseUsers>;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function clampPage(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export async function listUsers(query: UserListQuery): Promise<UserListResult> {
  const page = clampPage(query.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clampPage(query.pageSize, USER_LIST_DEFAULT_PAGE_SIZE, 1, USER_LIST_MAX_PAGE_SIZE);

  // Site filter resolves through the join table first.
  let siteUserIds: string[] | null = null;
  if (query.siteId !== undefined) {
    const rows = await db.orm.public.UserSite.where({ siteId: query.siteId }).all();
    siteUserIds = rows.map((r) => r.userId);
    if (siteUserIds.length === 0) {
      return { users: [], total: 0, page, pageSize };
    }
  }
  const siteIds = siteUserIds;

  const buildBase = (): UserCollection => {
    let collection: UserCollection = baseUsers();
    if (query.search !== undefined && query.search.trim() !== "") {
      const pattern = `%${escapeLike(query.search.trim())}%`;
      collection = collection.where((u) => or(u.name.ilike(pattern), u.email.ilike(pattern)));
    }
    if (query.role !== undefined) {
      collection = collection.where({ role: query.role });
    }
    if (query.status !== undefined) {
      collection = collection.where({ status: query.status });
    }
    if (siteIds !== null) {
      const ids: string[] = siteIds;
      collection = collection.where((u) => u.id.in(ids));
    }
    return collection;
  };

  const counted = await buildBase().aggregate((aggregate) => ({
    total: aggregate.count(),
  }));

  const rows = await buildBase()
    .orderBy((u) => u.createdAt.desc())
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all();

  const ids = rows.map((r) => r.id);
  const assignments =
    ids.length > 0
      ? await db.orm.public.UserSite.where((a) => a.userId.in(ids)).all()
      : [];
  const sitesByUser = new Map<string, string[]>();
  for (const a of assignments) {
    const list = sitesByUser.get(a.userId) ?? [];
    list.push(a.siteId);
    sitesByUser.set(a.userId, list);
  }

  return {
    users: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      status: r.status,
      department: r.department,
      siteIds: (sitesByUser.get(r.id) ?? []).sort(),
      emailVerified: r.emailVerifiedAt !== null,
      mustChangePassword: r.mustChangePassword,
      createdAt: r.createdAt.toString(),
    })),
    total: counted.total,
    page,
    pageSize,
  };
}

export async function getUserDetails(userId: string): Promise<AdminUserDetails> {
  const row = await db.orm.public.User.where({ id: userId }).first();
  if (row === null) {
    throw new ProvisionError("USER_NOT_FOUND", "User does not exist.");
  }
  const assignments = await db.orm.public.UserSite.where({ userId }).all();
  const siteIds = assignments.map((a) => a.siteId);
  const siteRows =
    siteIds.length > 0
      ? await db.orm.public.Site.where((s) => s.id.in(siteIds)).all()
      : [];
  const siteById = new Map(siteRows.map((s) => [s.id, { id: s.id, code: s.code, name: s.name }]));
  const sites: Array<{ id: string; code: string; name: string }> = [];
  for (const id of [...siteIds].sort()) {
    const site = siteById.get(id);
    if (site !== undefined) {
      sites.push({ id: site.id, code: site.code, name: site.name });
    }
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    department: row.department,
    siteIds: [...siteIds].sort(),
    emailVerified: row.emailVerifiedAt !== null,
    mustChangePassword: row.mustChangePassword,
    createdAt: row.createdAt.toString(),
    sites,
  };
}

export async function listSites(): Promise<Array<{ id: string; code: string; name: string }>> {
  const rows = await db.orm.public.Site.orderBy((s) => s.name.asc()).all();
  return rows.map((r) => ({ id: r.id, code: r.code, name: r.name }));
}
