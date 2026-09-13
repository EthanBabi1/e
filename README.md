# Podium Row (placeholder name — see DECISIONS.md)

Grassroots kart racing results + sponsorship marketplace. Built per the phased brief; see `PLAN.md`, `DESIGN.md`, `COMPLIANCE.md`, `DATA-ACCESS.md`, `DECISIONS.md`, `REVIEW.md`, `OPEN-QUESTIONS.md`.

**Status:** all 6 phases complete. This README describes what's actually runnable at the current commit — see the closing report in the final commit message, and `REVIEW.md`, for an honest list of what still needs real credentials or a second look before a real launch.

## Quick start

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL at minimum
pnpm db:generate             # generate SQL migrations from db/schema
pnpm db:migrate              # apply them
pnpm db:seed                 # 2 fictional tracks, 40 racers, a season of results
pnpm dev
```

Visit `http://localhost:3000/style` for the rendered design system and `http://localhost:3000/demo` for the one fully populated fictional profile. `/admin` and everything under it now requires a real signed-in admin account (see Phase 6 below) — the seed script grants admin to `CONFIG.ownerEmail` automatically.

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
- `/admin/metrics` — funnel dashboard (real admin-gated route as of Phase 6 — see below).

## Accounts, messaging, notifications (Phase 4)

- **Auth**: `/sign-in` — Resend magic link and/or Google OAuth, whichever has credentials configured (`AUTH_RESEND_KEY`, or `AUTH_GOOGLE_ID`+`AUTH_GOOGLE_SECRET`). Neither is set in this environment by default — `/sign-in` says so rather than showing a dead button.
- **Claiming a profile**: `/claim/[token]` — an adult claims directly; a minor's profile is claimed by a guardian, who declares their relationship and gives separate, plain-language consent before the profile becomes public.
- **Dashboard**: `/dashboard` — lists the racer profile(s) you manage (your own, or any minor you're the guardian of), with links to edit the story/bio, messages, and notifications.
- **Messaging**: `/dashboard/messages` — an enquiry from a racer's profile opens a thread; a minor's thread routes to their guardian, never the racer; contact-detail sharing (phone/email/social handles) is blocked with an explanation in any thread involving a minor.
- **Notifications**: in-app centre at `/dashboard/notifications`, plus email via Resend when `RESEND_API_KEY` is set (skipped with a console warning otherwise — nothing crashes). Financial notifications can only be sent to a resolved guardian/adult user id, never a bare racer id — see `lib/notifications/dispatch.ts`.
- **Email templates**: React Email, previewable at `/dev/emails` — dev-mode only by design (checks `NODE_ENV`).
- **Legal pages**: `/terms`, `/privacy`, `/sponsorship-terms`, `/for-parents`, `/verification`, `/rating`, `/fees` — real routes, versioned in the `policy_versions` table, each flagged where it still needs legal review.

## Money (Phase 5) — test mode only, always

Every dollar amount anywhere in this codebase is Stripe **test mode**. `lib/config.ts` refuses to construct a Stripe client from anything that isn't an `sk_test_`/`pk_test_` key.

- **Zones**: `/dashboard/zones` — set a price (validated against a floor/ceiling — `lib/pricing/zonePricing.ts`), see the platform's suggested range. A minor's listing needs a guardian's approval (`/api/zones/listing/approve`) before it goes public.
- **Checkout**: `/api/checkout/buy-now` (Stripe Checkout, hosted) for a fixed-price zone; `/api/checkout/bid` + `/api/checkout/bid/setup-intent` for an auction bid (SetupIntent via Checkout in `setup` mode — a card is saved, nothing charged, until the bid wins).
- **Escrow**: sponsor pays → guardian approves the winner (minors only) → racer/guardian uploads a decal photo → sponsor confirms, or 7 days elapse → funds transfer to the racer's (or guardian's) connected account, minus the platform's take rate. State machine in `lib/sponsorships/escrow.ts`; the full flow is at `/dashboard/sponsorships`.
- **Payouts**: `/dashboard` → "Set up payouts" starts Stripe Connect Express onboarding. A minor's payout account always belongs to their guardian — there is no code path that creates one naming a minor.
- **Subscriptions**: `/dashboard/upgrade` shows the live Pro-vs-free savings math against the racer's actual sponsorship volume this season, and is honest when Pro isn't worth it yet.
- **Withdrawals**: `lib/sponsorships/withdrawal.ts` computes a pro-rata refund or sponsor credit for a mid-term cancellation — wired as a function, not yet exposed in any UI (see `REVIEW.md`).
- **Webhook**: `POST /api/stripe/webhook`. For local testing once you have a Stripe test key: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Tracks, admin console, account deletion (Phase 6)

- **Track portal**: `/track-portal/[slug]` — a track claims its own page (`/api/tracks/claim`), then sees its revenue, championship standings (with drop-scores), an embeddable leaderboard snippet, and its roster. `/embed/tracks/[slug]` is the actual embeddable widget the snippet points at — deliberately outside the main `(site)` route group, so it renders with no header/nav for a clean iframe.
- **Admin console**: everything under `/admin` (dashboard, metrics, moderation, withdrawals, series-sponsorships, impersonate-search) now requires a real signed-in account with `isPlatformAdmin` set — `requireAdmin()` for pages, `requireAdminApiWithAudit()` for API routes, the latter writing an `audit_log` row before the action runs. `/admin/impersonate` is search-only (finds the account a support request is about); it does not issue a working session-swap — see `REVIEW.md` #27.
- **Account deletion**: a "Delete this profile" control on `/dashboard/profile`. A guardian deleting their minor's profile purges everything — results, laps, messages, claims, profile PII — immediately (`lib/accounts/deletion.ts`); an adult deleting their own goes into a 90-day restorable hold first, then the same purge. A racer with retained sponsorship history survives as a scrubbed tombstone (no name/photo/story/results) rather than being removed outright, since financial records can't be hard-deleted while retention obligations exist. Covered end-to-end by `tests/integration/account-deletion.test.ts`.
- **Public takedown request**: `/remove` — no account needed, for anyone (including someone who never signed up) asking to have a profile taken down.
- **Cron, on an actual schedule** (`vercel.json`), each requiring `Authorization: Bearer $CRON_SECRET`: `/api/cron/auction-close` and `/api/cron/escrow-release` (daily — Vercel's free Hobby plan caps cron frequency at once/day; a paid plan can safely tighten these to every 15 min / hourly for snappier auction-close and escrow-release timing), `/api/cron/digests` and `/api/cron/track-revenue-share` (monthly), `/api/cron/deletion-sweep` (daily, purges 90-day-elapsed deletion requests).

## Full setup

- **Database / migrations / seed** — done, Phase 1.
- **Results ingest** — done, Phase 2.
- **Public surface** — done, Phase 3.
- **Auth / accounts / messaging / notifications / legal pages** — done, Phase 4.
- **Money (Connect, checkout, escrow, subscriptions)** — done, Phase 5 — but see `REVIEW.md` #21: none of it has touched a live Stripe API call yet, for lack of a test key in this environment.
- **Tracks, admin console, account deletion, scheduled cron** — done, Phase 6 (above).
- **Deploy** — Vercel; live payment keys are never used (test mode only, everywhere — see `lib/config.ts`, which refuses to boot Stripe with a non-`sk_test_`/`pk_test_` key). No live deploy has been made from this build.

See `REVIEW.md` for the full, honest list of what needs real credentials (Stripe, Resend, Google OAuth, Anthropic, object storage) or a second look (legal copy, real photos, a security pass on impersonation) before this goes live with real people's data.
