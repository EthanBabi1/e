# DATA-ACCESS.md — MYLAPS Speedhive ingest research (Phase 0)

## Summary (also flagged at the top of `REVIEW.md`)

**Path A (transponder-linked MYLAPS import) ships disabled behind a feature flag. Path B (photo/PDF/screenshot via Claude vision) is the primary, default ingest path.** This is a product decision made under uncertainty, not a technical dead end — it should be revisited the moment an actual conversation with MYLAPS happens.

## What was checked

1. **`mylaps.com` and its subdomains are unreachable from this build environment** (egress-proxy blocked). I could not load MYLAPS's own terms-of-service or developer pages directly. This alone is disqualifying for shipping live: an ingest path this build cannot even verify the terms of, cannot go live as the default.
2. **No public, official MYLAPS developer program or published API terms of service were found** via web search. Everything discoverable about `api2.mylaps.com` comes from a single community, reverse-engineered project (`github.com/ncrosty58/speedhive-tools`), not from MYLAPS documentation.
3. That community client's own README describes **organization/event-scoped access** (organizations, events, sessions, results, laps, lap charts, announcements, championships) — there is no documented **racer-scoped** token or auth mode (e.g. "give me only the results tied to my transponder"). The brief's own instruction is explicit: *"Pulling one racer's own results at their request is a very different proposition from mirroring an organization's entire history, whatever the endpoints technically allow. Always default to the narrow, racer-scoped pattern."* The narrow pattern the brief asks for does not appear to exist as a supported, sanctioned mode of this API — only the broad one does, via reverse engineering.
4. No terms were found (because none could be reached) that affirmatively permit caching, redisplay, or **commercial use** — all three of which this platform needs (results live permanently on a racer's page, feed a paid sponsorship storefront, and are cached to avoid re-hitting the upstream).

## Decision

Per the brief's own resolution rule for this exact situation (Phase 0: *"If the terms are restrictive, ambiguous, or access requires a partnership that doesn't exist yet, make Path B the primary ingest, keep Path A behind a feature flag, and put a one-paragraph summary at the top of `REVIEW.md`"*):

- **Path B (photo/PDF/CSV extraction via Claude vision) is the primary and default ingest path**, built out fully in Phase 2.
- **Path A is implemented as real, working code** (transponder entry UI, confirmation-list UX, an ingest adapter with retry/backoff/idempotency, the `mylaps_link` schema) **but gated behind `FEATURE_MYLAPS_IMPORT=false`** in `lib/config.ts`. Flip it once an actual license/partnership conversation with MYLAPS has happened and a racer-scoped (or at minimum, clearly commercially-licensed) access mode is confirmed.
- The adapter is written against the community client's documented shapes (`events`, `sessions`, `results`, `laps`) as **documentation of the data model only**, per the brief's instruction ("read it for the endpoint shapes... use it as documentation, not as a dependency") — no code from that project is vendored, and no live calls are made to `api2.mylaps.com` anywhere in this build, since we hold no credential for it and haven't confirmed we're allowed to.
- When Path A is later enabled, keep the access pattern to the narrowest one MYLAPS actually grants — even if that turns out to be broader than "one racer's transponder," default the *product surface* (what we request and cache) to racer-initiated, on-demand pulls rather than pre-emptive organization-wide mirroring.

## Consequence for the build

- Every racer signs up via Path B/C/D in this version. The "transponder number → complete profile in two minutes" flow described in section 3 is **built and functional against a mock/fixture data source** (`lib/ingest/mylaps/fixtures.ts`) so the UX, confirmation-list, sync-status, and failure-handling code paths are all real and tested — they simply aren't wired to the live MYLAPS API. Flipping the flag and swapping the fixture adapter for a real HTTP client is the only work needed once access is sorted out.
- Provenance tiers (section 3) still work correctly: fixture-sourced Path A data used in seed/demo is labeled `transponder-verified (demo fixture)` and never presented as a real upstream sync in non-demo contexts.

## What I need from you (owner)

See `REVIEW.md` item #1 — this needs an actual conversation with MYLAPS (`support.speedhive@mylaps.com` was the only contact surfaced by search) about API terms, before Path A can go live for real users.
