# Podium Row (placeholder name — see DECISIONS.md)

Grassroots kart racing results + sponsorship marketplace. Built per the phased brief; see `PLAN.md`, `DESIGN.md`, `COMPLIANCE.md`, `DATA-ACCESS.md`, `DECISIONS.md`, `REVIEW.md`, `OPEN-QUESTIONS.md`.

**Status:** in progress — phases are committed as they land. This README is updated at each phase boundary; the setup steps below reflect what's actually runnable at the current commit, not the finished product.

## Quick start

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL at minimum
pnpm dev
```

Visit `http://localhost:3000/style` for the rendered design system.

## Stack

Next.js 15 (App Router, Turbopack) · TypeScript · Tailwind v4 · Drizzle ORM / Postgres (Neon) · Auth.js · Stripe (test mode only) · Resend + React Email · Anthropic API (results extraction) · Framer Motion + Lenis.

## Full setup (filled in as each phase lands)

- **Database / migrations** — added in Phase 1.
- **Seed data** — added in Phase 1 (`pnpm db:seed`).
- **Stripe webhook forwarding** — added in Phase 5.
- **Cron jobs** — added in Phase 5/6.
- **Deploy** — Vercel; live payment keys are never used (test mode only, everywhere — see `lib/config.ts`).
