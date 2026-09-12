# PLAN.md — Architecture

Platform: **Podium Row** (placeholder name — see `DECISIONS.md`). Next.js 15 App Router, TypeScript, Tailwind v4, Drizzle/Postgres, Auth.js, Stripe Connect, Resend/React Email, Anthropic API.

## Directory layout

```
app/
  (marketing)/            public marketing pages: /, /for-parents, /verification, /rating, /fees, /terms, /privacy, /sponsorship-terms
  (public)/
    racers/[slug]/        racer profile (server-rendered)
    tracks/[slug]/        track public page
    races/[id]/           single race result page
    leaderboards/         track/class/region/national leaderboards
    marketplace/          zone marketplace, filters, "sponsor a racer near you"
    search/               site search
  demo/                   fully populated fictional racer + demo marketplace
  style/                  rendered design-token style tile (Phase 0 deliverable)
  dashboard/              authenticated racer/guardian dashboard
    profile/ story/ results/ zones/ sponsors/ messages/ payouts/ settings/
  track-portal/           authenticated track dashboard
    championships/ roster/ calendar/ revenue/ widget/
  admin/                  admin console (verification, disputes, payouts, metrics, impersonation)
  api/
    auth/[...nextauth]/
    stripe/webhook/
    ingest/{mylaps,photo,csv,manual}/
    cron/{auction-close,digest,sync-mylaps}/
    og/[type]/[id]/       @vercel/og share cards
  remove/                 public unclaimed-profile takedown request route

db/
  schema/                 drizzle schema, one file per domain area
  migrations/
  seed/                   seed script + fixtures (2 fictional tracks, 40 racers, 1 season)

lib/
  config.ts               single source of truth for CONFIG values + feature flags + live-key guard
  ratings/                Elo-style rating engine, provisional/confidence-band logic
  ingest/
    mylaps/               Path A adapter (flagged off) + fixtures
    vision/                Path B: Claude vision extraction + confidence scoring
    csv/                  Path C: column-mapping + per-track memory
  images/                 upload pipeline: EXIF strip, crop, quality gate, deterministic fallback art, grading
  stripe/                 Connect, Billing, Checkout, escrow release helpers
  notifications/          event → template → channel dispatch, digest batching
  search/                 Postgres FTS + trigram helpers
  minors/                 single source of truth for "is this profile a minor" + redaction helpers (imported everywhere a profile renders)
  email/                  React Email templates, previewable at /dev/emails

components/
  motion/                 Lenis provider, reveal/stagger primitives, magnetic CTA, count-up
  profile/                hero, story, record table, telemetry, storefront, media kit
  marketplace/            zone card, filters, bid ticket
  admin/                  metrics widgets, queues
  ui/                     shared design-system primitives (buttons, cards, badges, empty-state)

tests/
  unit/                   ratings, take-rate math, minors redaction, price bounds
  integration/            ingest fixtures, bid concurrency
```

## Data model (Phase 1 detail)

Core tables (see `db/schema/*.ts` for the authoritative Drizzle definitions):

- `users`, `guardians`, `guardian_racers` (join, since a guardian can hold multiple minors and in rare cases two guardians share one minor)
- `tracks`, `track_staff`
- `racers` (`is_minor` derived + stored redundantly for query-time filtering, `dob` never null but never rendered for minors)
- `transponders`, `transponder_assignments` (date-ranged binding to a racer)
- `series`, `series_rounds`, `points_systems`
- `events`, `sessions` (`type`: practice | qualifying | race), `results`, `laps`
- `ratings` (per racer, per class, with `mu`, `sigma`, `ranked_result_count`, `is_provisional`)
- `claims`, `claim_invitations`
- `zones`, `zone_listings`, `bids`, `sponsorships`, `sponsorship_agreements`, `agreement_versions`
- `messages`, `message_threads`, `thread_participants`
- `notifications`, `notification_preferences`
- `subscriptions` (Pro), `payouts`, `connect_accounts`
- `series_sponsorships` (championship/class sponsorship, admin-managed)
- `moderation_reports`, `takedown_requests`, `audit_log`
- `policy_versions`, `policy_acceptances`

Every table that can display a person's data carries or joins to `is_minor` so redaction is enforced at the query layer (`lib/minors/`), not just in components — this is what the DoD tests in section 16 check.

## Routing/rendering strategy

- All public racer/track/race/leaderboard pages are **server components**, statically-shaped but revalidated on publish (ISR via `revalidatePath` after ingest writes), so they're indexable with structured data per section 9.
- Dashboards and admin are client-heavy behind auth, no SEO concerns.
- Cron: Vercel Cron hits `/api/cron/*` routes for auction closes, MYLAPS re-sync (when flagged on), and digest sends.

## Full detail

Schema field-level detail lives in the Drizzle files themselves (self-documenting via types); this file stays at the architecture level so it doesn't drift out of sync with code.
