// Bulk provisioning: Excel-style import and batched credential generation.
// Server-only.
//
// Two-event credential model (Phase 8): import creates credential-less
// accounts (passwordHash null — nothing to steal), and a LATER batch call
// generates all temporary credentials in one operation. The batch response
// IS the export the admin saves; afterwards the plaintext exists nowhere —
// not in the DB, not in logs, not retrievable. Re-distribution means fresh
// credentials (overwriting the hash kills the old ones).
import { z } from "zod";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";

import { requireAdmin } from "./authorize";
import { recordAudit } from "./audit";
import { ProvisionError } from "./errors";
import { generateTempPassword, hashPassword } from "./password";
import {
  provisionInputSchema,
  type ProvisionedUser,
} from "./provision";
import {
  isAssignableRole,
  MAX_SITES,
  MIN_SITES,
} from "./roles";
import { checkThrottle, recordThrottleFailure } from "./throttle";

const varchar = <N extends number>(value: string) => value as Varchar<N>;

export const IMPORT_MAX_ROWS = 200;
export const CREDENTIALS_MAX_USERS = 200;

// Batch endpoints are admin-only but unaudited-by-default traffic: bound the
// per-admin call rate (hashing + mailing budget) separately from login.
export const BULK_WINDOW_MS = 60 * 60 * 1000;
export const BULK_MAX_CALLS = 20;

function bulkKey(adminId: string, operation: string): string {
  return `bulk-${operation}:${adminId}`;
}

async function checkBulkBudget(adminId: string, operation: string): Promise<void> {
  const key = bulkKey(adminId, operation);
  try {
    await checkThrottle(key, { windowMs: BULK_WINDOW_MS, maxAttempts: BULK_MAX_CALLS });
  } catch {
    throw new ProvisionError("RATE_LIMITED", "Too many bulk operations. Try again later.");
  }
  await recordThrottleFailure(key, { windowMs: BULK_WINDOW_MS, maxAttempts: BULK_MAX_CALLS });
}

const rowsSchema = z.array(z.unknown()).min(1).max(IMPORT_MAX_ROWS);
const userIdsSchema = z.array(z.uuid()).min(1).max(CREDENTIALS_MAX_USERS);

export type ImportFailedRow = {
  index: number;
  email: string | null;
  code: string;
};

export type ImportResult = {
  created: ProvisionedUser[];
  failed: ImportFailedRow[];
};

export type CredentialsFailedRow = {
  userId: string;
  code: string;
};

export type CredentialsResult = {
  credentials: Array<{ userId: string; email: string; tempPassword: string }>;
  failed: CredentialsFailedRow[];
};

/**
 * Bulk-create users from parsed rows (the UI parses Excel client-side and
 * sends JSON). Every row gets full single-provision validation; rows are
 * independent — one bad row never fails the rest. Accounts are created
 * WITHOUT credentials; use generateUserCredentials later to distribute.
 */
export async function importUsers(adminId: string | null, rawRows: unknown): Promise<ImportResult> {
  const admin = await requireAdmin(adminId);
  await checkBulkBudget(admin.id, "import");
  const parsedRows = rowsSchema.safeParse(rawRows);
  if (!parsedRows.success) {
    throw new ProvisionError("INVALID_INPUT", "Invalid import payload.");
  }

  const created: ProvisionedUser[] = [];
  const failed: ImportFailedRow[] = [];
  const seenEmails = new Set<string>();

  for (const [index, raw] of parsedRows.data.entries()) {
    const parsed = provisionInputSchema.safeParse(raw);
    if (!parsed.success || !isAssignableRole(parsed.data.role)) {
      failed.push({ index, email: null, code: "INVALID_INPUT" });
      continue;
    }
    const input = parsed.data;
    if (seenEmails.has(input.email)) {
      failed.push({ index, email: input.email, code: "DUPLICATE_EMAIL" });
      continue;
    }
    seenEmails.add(input.email);

    try {
      const existing = await db.orm.public.User.where({
        email: varchar<255>(input.email),
      }).first();
      if (existing !== null) {
        failed.push({ index, email: input.email, code: "DUPLICATE_EMAIL" });
        continue;
      }
      const siteIds = [...new Set(input.siteIds)];
      if (siteIds.length > 0) {
        const rows = await db.orm.public.Site.where((s) => s.id.in(siteIds)).all();
        if (rows.length !== siteIds.length) {
          failed.push({ index, email: input.email, code: "UNKNOWN_SITE" });
          continue;
        }
      }
      if (siteIds.length < MIN_SITES[input.role] || siteIds.length > MAX_SITES[input.role]) {
        failed.push({ index, email: input.email, code: "SITE_CARDINALITY" });
        continue;
      }
      const userId = crypto.randomUUID();
      await db.transaction(async (tx) => {
        await tx.orm.public.User.create({
          id: userId,
          email: varchar<255>(input.email),
          name: varchar<255>(input.name),
          passwordHash: null,
          role: input.role,
          department: input.department ? varchar<128>(input.department) : null,
          status: input.status,
          emailVerifiedAt: null,
          mustChangePassword: true,
        });
        for (const siteId of siteIds) {
          await tx.orm.public.UserSite.create({ userId, siteId });
        }
      });
      created.push({
        id: userId,
        email: input.email,
        name: input.name,
        role: input.role,
        status: input.status,
        department: input.department ?? null,
        siteIds,
        mustChangePassword: true,
      });
      await recordAudit("user.imported", admin.id, userId);
    } catch {
      // Narrow window: a concurrent import may have taken the email between
      // the check and the insert. Re-read to report the precise code.
      const raced = await db.orm.public.User.where({
        email: varchar<255>(input.email),
      }).first();
      failed.push({
        index,
        email: input.email,
        code: raced !== null ? "DUPLICATE_EMAIL" : "INVALID_INPUT",
      });
    }
  }

  return { created, failed };
}

/**
 * Generate temporary credentials for many users in ONE operation. Each
 * account must exist and be active; everyone else lands in `failed`.
 * Secrets appear only in this response — never stored, never logged.
 */
export async function generateUserCredentials(
  adminId: string | null,
  rawUserIds: unknown,
): Promise<CredentialsResult> {
  const admin = await requireAdmin(adminId);
  await checkBulkBudget(admin.id, "credentials");
  const parsed = userIdsSchema.safeParse(rawUserIds);
  if (!parsed.success) {
    throw new ProvisionError("INVALID_INPUT", "Invalid user list.");
  }

  const credentials: CredentialsResult["credentials"] = [];
  const failed: CredentialsFailedRow[] = [];

  for (const userId of [...new Set(parsed.data)]) {
    const target = await db.orm.public.User.where({ id: userId }).first();
    if (target === null) {
      failed.push({ userId, code: "USER_NOT_FOUND" });
      continue;
    }
    if (target.status !== "active") {
      failed.push({ userId, code: "ACCOUNT_DISABLED" });
      continue;
    }
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    await db.orm.public.User.where({ id: userId }).update({
      passwordHash: varchar<255>(passwordHash),
      passwordSetAt: Temporal.Now.instant(),
      mustChangePassword: true,
    });
    credentials.push({ userId, email: target.email, tempPassword });
    await recordAudit("credentials.generated", admin.id, userId);
  }

  return { credentials, failed };
}
