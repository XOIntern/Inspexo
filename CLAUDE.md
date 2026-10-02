@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Next.js dev server (localhost:3000)
npm run build          # production build
npm run lint           # ESLint
npm test               # vitest in watch mode
npm run test:run       # vitest once (CI mode)
npx vitest run tests/home.integration.test.tsx   # single test file
npx vitest run -t "navigates to /login"          # single test by name

docker compose up -d   # Postgres 18 on port 5434 (reads DB_* vars from .env)
npm run contract:emit  # regenerate src/prisma/contract.json + contract.d.ts
npx prisma db init     # create tables in the database
```

Copy `.env.example` to `.env` first — it holds `DATABASE_URL` and the `DB_*` vars used by compose.yaml.

## Architecture

InspeXO: HSE management system (audits, inspections, findings, corrective actions). Currently a marketing landing page + login; auth and DB-backed features are not wired up yet.

- **Next.js 16 App Router** — routes in `app/`, shared components in `components/`. This is a newer Next.js than you know; see the AGENTS.md note above before writing framework code.
- **Prisma 8 contract-based ORM** (`prisma-8.md` is the vendor walkthrough): models are defined in `src/prisma/contract.prisma`; after editing, run `npm run contract:emit` and commit the regenerated `contract.json`/`contract.d.ts` alongside it. The client is `db` from `src/prisma/db.ts`, queried as `db.orm.public.User...`. `prisma.config.ts` loads `.env` via dotenv. The CLI never touches the DB without explicit consent (`--probe-db` / `db init`).
- **shadcn with base-nova style** on `@base-ui/react` (not Radix) — primitives in `components/ui/`, config in `components.json`. `cn` comes from the `cn` package via `lib/utils.ts`. Tailwind v4, theme variables in `app/globals.css`.
- **Path alias** `@/` → repo root (see `tsconfig.json` / `vitest.config.ts`).

### App flow

`/` renders Header + Hero + ScrollGlobe, then a splash screen (~1600ms) and login-page skeleton (~900ms) before `router.push("/login")` — all timer-driven, covered by `tests/home.integration.test.tsx` with fake timers. `/login` renders `components/login-page.tsx`; authentication is not wired up yet.
