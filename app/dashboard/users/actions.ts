"use server"

import { revalidatePath } from "next/cache"

import {
  setUserStatus as setUserStatusOp,
  updateUserContact,
  updateUserRole,
} from "@/src/lib/auth/admin"
import { provisionUser } from "@/src/lib/auth/provision"
import { requireUser } from "@/src/lib/auth/server-user"

import { userFormSchema } from "./users-data"

// All three actions authenticate FIRST via the session cookie and delegate
// to the admin backend, which re-validates role, sites, and status.
// There is no unauthenticated or unvalidated write path anymore (H-1).
// Non-admin callers get a 403 from the backend; the error surfaces in the
// dialog exactly like a validation failure.
export async function createUser(input: unknown) {
  const admin = await requireUser()
  const data = userFormSchema.parse(input)
  const siteIds = (input as { siteIds?: unknown } | null)?.siteIds ?? []
  const result = await provisionUser(admin.id, { ...data, siteIds })
  revalidatePath("/dashboard/users")
  // Shown once to the admin for out-of-band relay; never stored or logged.
  return { id: result.user.id, tempPassword: result.tempPassword }
}

export async function updateUser(input: unknown) {
  const admin = await requireUser()
  const { id, name, email, role, status } = userFormSchema.parse(input)
  if (!id) throw new Error("User id is required")
  // Contact first: an email clash aborts before role/status change.
  await updateUserContact(admin.id, id, { name, email })
  await updateUserRole(admin.id, id, role)
  await setUserStatusOp(admin.id, id, status)
  revalidatePath("/dashboard/users")
  return { id }
}

// Toggle status cepat dari dropdown baris.
export async function setUserStatus({ id, status }: { id: string; status: "active" | "inactive" }) {
  const admin = await requireUser()
  await setUserStatusOp(admin.id, id, status)
  revalidatePath("/dashboard/users")
  return { id }
}
