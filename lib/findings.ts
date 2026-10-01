import { z } from "zod"

// Dipakai bersama server (app/dashboard/page.tsx) dan client (data-table):
// modul biasa, bukan "use client", supaya .parse() bisa jalan di RSC.
export const schema = z.object({
  id: z.number(),
  title: z.string(),
  site: z.string(),
  severity: z.enum(["Critical", "High", "Medium", "Low"]),
  status: z.string(),
  owner: z.string(),
  dueDate: z.string(),
})

export const findingsSchema = z.array(schema)

export type Finding = z.infer<typeof schema>
