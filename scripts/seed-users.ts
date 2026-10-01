// Seed user registry dengan data contoh (sama dengan fallback users-data.ts).
// Jalankan HANYA dengan persetujuan, setelah `npx prisma db init`:
//   node --experimental-strip-types scripts/seed-users.ts
import { db } from "../src/prisma/db.ts";
import { sampleUsers } from "../app/dashboard/users/users-data.ts";

const existing = await db.orm.public.User.all();
if (existing.length > 0) {
  console.log(`Skip: tabel user sudah berisi ${existing.length} baris.`);
  await db.close?.();
  process.exit(0);
}

for (const u of sampleUsers) {
  await db.orm.public.User.create({
    id: u.id,
    email: u.email,
    name: u.name,
    passwordHash: "-",
    role: u.role,
    status: u.status,
  });
}
console.log(`Seed ${sampleUsers.length} user selesai.`);
