# Podium Row (placeholder name — see DECISIONS.md)

Grassroots kart racing results + sponsorship marketplace. Built per the phased brief; see `PLAN.md`, `DESIGN.md`, `COMPLIANCE.md`, `DATA-ACCESS.md`, `DECISIONS.md`, `REVIEW.md`, `OPEN-QUESTIONS.md`.

**Status:** in progress — phases are committed as they land. This README is updated at each phase boundary; the setup steps below reflect what's actually runnable at the current commit, not the finished product.

## Quick start

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL at minimum
pnpm db:generate             # generate SQL migrations from db/schema
pnpm db:migrate              # apply them
pnpm db:seed                 # 2 fictional tracks, 40 racers, a season of results
pnpm dev
```

Visit `http://localhost:3000/style` for the rendered design system and `http://localhost:3000/admin` for the (currently unauthenticated — see PLAN.md) data-verification view.

## Database

Any Postgres 14+ works for local dev — this doesn't require Neon-specific features. Example against a local instance:

```bash
createdb podium_row
# DATABASE_URL="postgres://user:password@localhost:5432/podium_row"
```

Production targets Neon (`DATABASE_URL` from your Neon project) — no code change required, same connection string shape.

- `pnpm db:generate` — generate a new migration from `db/schema/*.ts` after a schema change
- `pnpm db:migrate` — apply pending migrations
- `pnpm db:studio` — Drizzle Studio, browse the local DB
- `pnpm db:seed` — **destructive**: truncates and reseeds all seed-managed tables

## Tests

```bash
pnpm test
```

Unit tests (ratings engine, minors redaction) need no setup. Integration tests that hit Postgres directly (leaderboard/provenance behavior) auto-skip if `DATABASE_URL` isn't set, and run against whatever `.env.local` points at otherwise — point it at a disposable database, not anything with real data, since these tests insert and delete rows.

## Stack

Next.js 15 (App Router, Turbopack) · TypeScript · Tailwind v4 · Drizzle ORM / Postgres (Neon) · Auth.js · Stripe (test mode only) · Resend + React Email · Anthropic API (results extraction) · Framer Motion + Lenis.

## Full setup (filled in as each phase lands)

- **Database / migrations / seed** — done, Phase 1 (above).
- **Auth / accounts** — added in Phase 4.
- **Stripe webhook forwarding** — added in Phase 5.
- **Cron jobs** — added in Phase 5/6.
- **Deploy** — Vercel; live payment keys are never used (test mode only, everywhere — see `lib/config.ts`, which refuses to boot Stripe with a non-`sk_test_`/`pk_test_` key).
