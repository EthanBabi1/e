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

## Ingest (Phase 2)

Four paths land results, all converging on one review-before-publish screen:

- **Manual entry** (`/dashboard/results/import`, "Type it in") — always available.
- **CSV / paste** — auto-detects columns, remembers the mapping per track after the first upload.
- **Photo / PDF of a results sheet** — needs `ANTHROPIC_API_KEY`; without it the route returns a clean "use manual entry instead" response rather than failing.
- **MYLAPS transponder import** — off by default (`FEATURE_MYLAPS_IMPORT=false`). See `DATA-ACCESS.md` for why; flipping it on runs against a documented fixture adapter, not a live upstream, until real API access is confirmed.

No row becomes visible on a public page, a leaderboard, or a rating until it's confirmed on the review screen (`results.publishedAt`) — this holds even for a technically "verified" source.

Export a racer's full record any time: `GET /api/export/:racerId/csv` and `/pdf`.

## Public surface (Phase 3)

- `/racers/[slug]` — racer profile: hero, story, storefront (display-only zones), rating (hidden while provisional), form guide, record table, telemetry chart. Renders correctly at empty/sparse/full density.
- `/tracks/[slug]`, `/races/[id]` — track page and single-race results, both with structured data (JSON-LD).
- `/leaderboards`, `/marketplace`, `/search` — leaderboards (provisional/self-reported always excluded), zone marketplace, typo-tolerant site search.
- `/demo` — the one fully populated fictional racer (`demo-jordan-vance`), rendered through the exact same components as a real profile.
- `/api/og/racer/[slug]` — share card images (never generated for an unclaimed minor).
- `/sitemap.xml`, `/robots.txt` — sitemap excludes every noindexed (unclaimed-minor) profile.
- `/admin/metrics` — funnel dashboard (unauthenticated dev route — see caveat above for `/admin`).

## Full setup (filled in as each phase lands)

- **Database / migrations / seed** — done, Phase 1 (above).
- **Results ingest** — done, Phase 2 (above).
- **Public surface** — done, Phase 3 (above).
- **Auth / accounts** — added in Phase 4.
- **Stripe webhook forwarding** — added in Phase 5.
- **Cron jobs** — added in Phase 5/6.
- **Deploy** — Vercel; live payment keys are never used (test mode only, everywhere — see `lib/config.ts`, which refuses to boot Stripe with a non-`sk_test_`/`pk_test_` key).
