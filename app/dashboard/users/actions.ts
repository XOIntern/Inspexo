"use server"

import { revalidatePath } from "next/cache"
import type { Varchar } from "@prisma/orm-postgres/target/codec-types"

import { db } from "@/src/prisma/db"

import { userFormSchema } from "./users-data"

// Input create/update memakai brand Varchar<N> (phantom type; runtime string biasa).
const varchar = <N extends number>(value: string) => value as Varchar<N>

// Buat user baru. passwordHash "-" placeholder — admin sets the real temporary
// password out-of-band; hashing menyusul saat auth di-wire.
export async function createUser(input: unknown) {
  const data = userFormSchema.parse(input)
  await db.orm.public.User.create({
    id: crypto.randomUUID(),
    email: varchar<255>(data.email),
    name: varchar<255>(data.name),
    passwordHash: varchar<255>("-"),
    role: data.role,
    status: data.status,
  })
  revalidatePath("/dashboard/users")
}

// Update user berdasar id; email ikut bisa diedit karena registry belum terhubung auth.
export async function updateUser(input: unknown) {
  const { id, name, email, role, status } = userFormSchema.parse(input)
  if (!id) throw new Error("User id is required")
  await db.orm.public.User
    .where({ id })
    .update({ name: varchar<255>(name), email: varchar<255>(email), role, status })
  revalidatePath("/dashboard/users")
}

// Toggle status cepat dari dropdown baris.
export async function setUserStatus({ id, status }: { id: string; status: "active" | "inactive" }) {
  await db.orm.public.User.where({ id }).update({ status })
  revalidatePath("/dashboard/users")
}
