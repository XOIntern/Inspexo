import { z } from "zod"

// Nilai role/status sama dengan CHECK constraint di contract.prisma.
// Roles: admin (system-level) · verificator / auditor (multi-site) · auditee (single site).
export const USER_ROLES = ["admin", "verificator", "auditor", "auditee"] as const
export const USER_STATUSES = ["active", "inactive", "suspended"] as const
export type UserRole = (typeof USER_ROLES)[number]
export type UserStatus = (typeof USER_STATUSES)[number]

export const userFormSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1),
  email: z.email(),
  role: z.enum(USER_ROLES),
  status: z.enum(USER_STATUSES),
})
export type UserFormInput = z.infer<typeof userFormSchema>

// Baris serialisable untuk melewati batas RSC (createdAt sebagai string ISO).
export type UserRow = {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: string
}

export const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  verificator: "Verificator",
  auditor: "Auditor",
  auditee: "Auditee",
}
export const statusLabels: Record<UserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
}

// Data contoh: fallback saat DB belum di-init/seed, dipakai juga script seed.
export const sampleUsers: UserRow[] = [
  { id: "0194aaaa-aaaa-7aaa-8aaa-000000000001", name: "Rina Kusuma", email: "rina.kusuma@inspexo.id", role: "admin", status: "active", createdAt: "2025-08-04T02:10:00.000Z" },
  { id: "0194aaaa-aaaa-7aaa-8aaa-000000000002", name: "Budi Santoso", email: "budi.santoso@inspexo.id", role: "auditor", status: "active", createdAt: "2025-08-11T03:20:00.000Z" },
  { id: "0194aaaa-aaaa-7aaa-8aaa-000000000003", name: "Sari Wulandari", email: "sari.wulandari@inspexo.id", role: "auditee", status: "active", createdAt: "2025-08-19T04:05:00.000Z" },
  { id: "0194aaaa-aaaa-7aaa-8aaa-000000000004", name: "Andi Pratama", email: "andi.pratama@inspexo.id", role: "auditee", status: "inactive", createdAt: "2025-09-01T05:45:00.000Z" },
  { id: "0194aaaa-aaaa-7aaa-8aaa-000000000005", name: "Dewi Lestari", email: "dewi.lestari@inspexo.id", role: "verificator", status: "active", createdAt: "2025-09-08T06:30:00.000Z" },
  { id: "0194aaaa-aaaa-7aaa-8aaa-000000000006", name: "Joko Prasetyo", email: "joko.prasetyo@inspexo.id", role: "auditee", status: "suspended", createdAt: "2025-09-15T07:15:00.000Z" },
  { id: "0194aaaa-aaaa-7aaa-8aaa-000000000007", name: "Maya Anggraini", email: "maya.anggraini@inspexo.id", role: "verificator", status: "inactive", createdAt: "2025-09-22T08:00:00.000Z" },
  { id: "0194aaaa-aaaa-7aaa-8aaa-000000000008", name: "Hendra Gunawan", email: "hendra.gunawan@inspexo.id", role: "auditor", status: "active", createdAt: "2025-09-29T09:40:00.000Z" },
  { id: "0194aaaa-aaaa-7aaa-8aaa-000000000009", name: "Fitri Handayani", email: "fitri.handayani@inspexo.id", role: "auditee", status: "active", createdAt: "2025-10-06T10:25:00.000Z" },
  { id: "0194aaaa-aaaa-7aaa-8aaa-00000000000a", name: "Agus Riyanto", email: "agus.riyanto@inspexo.id", role: "verificator", status: "active", createdAt: "2025-10-13T11:05:00.000Z" },
  { id: "0194aaaa-aaaa-7aaa-8aaa-00000000000b", name: "Lina Marlina", email: "lina.marlina@inspexo.id", role: "auditee", status: "inactive", createdAt: "2025-10-20T12:50:00.000Z" },
  { id: "0194aaaa-aaaa-7aaa-8aaa-00000000000c", name: "Rizky Hidayat", email: "rizky.hidayat@inspexo.id", role: "auditor", status: "active", createdAt: "2025-10-27T13:35:00.000Z" },
]
