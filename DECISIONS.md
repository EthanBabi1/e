# DECISIONS.md

Every judgment call made during this build, one entry each: what was ambiguous, what was chosen, why. Read this first.

## Config and inputs

- **CONFIG block was pasted as literal `TODO` placeholders** (`PLATFORM_NAME`, `DOMAIN`, `OWNER_EMAIL`, `LAUNCH_TRACK`, `LAUNCH_REGION`), and **EXISTING CODE contained no source**, only the unfilled instruction text (`<<< PASTE REPO PATH OR SOURCE HERE >>>`). The brief itself flags this exact situation as a contradiction ("it will have to invent them, which the rules below forbid") but also gives the resolution mechanism: *"Missing content, assets, or credentials → stub them clearly, build against the stub, and list every stub in `REVIEW.md`."* I followed that mechanism rather than stalling or inventing anything that could pass as real. See `REVIEW.md` for the full list of what needs to be supplied before this is launch-real.
- **PLATFORM_NAME → "Podium Row"** (placeholder, chosen not assumed). Short, evokes both the results podium and a "row" of sponsor logos, no trademark check performed. Flagged in `REVIEW.md` for a real name + trademark clearance.
- **DOMAIN → `podiumrow.example`** used everywhere a domain is referenced (emails, OG tags, canonical URLs). Not a real, registered, or resolvable domain — chosen specifically so nothing in this repo points at a live third-party address by accident.
- **OWNER_EMAIL → the requesting user's own email**, used only for the seeded admin account and `.env.example`, consistent with "use it to identify the user, e.g. for authorship/attribution" — this is the closest analog (the platform's owner account) and it's a local/demo credential, never transmitted anywhere.
- **LAUNCH_TRACK / LAUNCH_REGION** were required inputs with no fictional-data escape hatch of their own (section 11's seeding tool needs a *real* track), but rule 4 forbids fabricating a track that could be mistaken for a real one. Resolution: seed data uses a track explicitly named **"Millhaven Kart Club (demo)"** in **"Millhaven, OH (demo region)"**, watermarked as fictional in the UI (`This is a demo track for illustration.`) everywhere it renders, and the launch-seeding admin tool takes a real track's data as input rather than hardcoding Millhaven. A real `LAUNCH_TRACK` must be supplied before the live seeding pass — see `REVIEW.md` item #1.
- **Financial config (`PRO_ANNUAL_USD`, `TAKE_RATE_FREE`, `TAKE_RATE_PRO`, `TRACK_REV_SHARE`) were filled in** in the brief (100 / 12% / 5% / 3%) and are used as-is, wired into `lib/config.ts` as the single source of truth (never hardcoded a second time in UI copy).
- **No existing racer sponsorship repo was supplied.** The brief describes it as live at a Vercel URL but pasting instructions were left unfilled. Rather than fetching an unknown third-party URL's source (not something this environment can safely scrape, and the brief's own "no scraping" rule plus "never guess URLs" constraint apply), the racer profile + zone/bid/Stripe-flow template described in EXISTING CODE was **built fresh from the written spec** (zone model, SetupIntent bid flow, anti-snipe, supporter tier, how-it-works/FAQ). Flagged in `REVIEW.md` — if a real prior repo exists, its actual assets (photography, exact copy) should replace the placeholders here.

## Architecture

- **Next.js 15 App Router + TypeScript + Tailwind v4**, matching section 14. Used `create-next-app@15` defaults (Turbopack dev/build) rather than hand-rolling config.
- **Drizzle ORM against Postgres**, designed to target Neon in production but runs against any Postgres locally (including a local/dev Postgres or Neon's free tier) — no Neon-specific feature is required to develop locally, which keeps the `/demo` route runnable without a live Neon account.
- **Monorepo-free single app.** No `packages/*` split — the brief's scope doesn't need it and it would add indirection without payoff at this stage.

## Deferred/stubbed by necessity (see REVIEW.md for the full, ordered list)

- Path A (MYLAPS transponder import) ships **behind a feature flag**, off by default, because API access requires a partnership decision documented in `DATA-ACCESS.md` that only the platform owner can pursue. Path B (photo/PDF via Claude vision) is the primary ingest path per the brief's own fallback rule.
- Stripe, Auth.js, and Resend all run against **test/sandbox credentials only**; no live key is ever read or written by this codebase (enforced in `lib/config.ts` guard).
- Phases are sequenced as instructed; later phases build on schema decided in Phase 1, so a change discovered later is recorded here rather than silently patched into Phase 1's writeup.

(Additional entries appended below as the build proceeds through phases.)
