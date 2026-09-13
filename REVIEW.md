# REVIEW.md — what you need to do before this is real

Ordered by what blocks launch soonest. Every item here is either a stub to replace, a credential to supply, or something needing legal review.

## Top of list

1. **MYLAPS/Speedhive API access is unresolved.** This build's environment could not reach `mylaps.com` at all (network egress blocked), and no public developer terms or partner program were found — see `DATA-ACCESS.md`. Path A (transponder import) is fully coded but shipped **disabled** behind `FEATURE_MYLAPS_IMPORT=false`, running against fixture data only. Before this can go live: contact MYLAPS (`support.speedhive@mylaps.com` was the only address surfaced by search) about racer-scoped API access, commercial redisplay rights, and caching terms. Until then, every real racer signs up via the photo/CSV/manual paths, which are fully functional.
2. **No existing repo was supplied** despite the brief describing one live at a Vercel URL. The racer profile, zone system, and Stripe bid flow were built fresh from the written spec in EXISTING CODE rather than lifted from real prior code/assets. If a real prior build exists, hand over its actual repo and photography/hero assets so they can replace what's here.
3. **CONFIG values are placeholders**: `PLATFORM_NAME` ("Podium Row"), `DOMAIN` (`podiumrow.example`), `LAUNCH_TRACK`/`LAUNCH_REGION` (a labeled fictional demo track, "Millhaven Kart Club (demo)"). Supply real values and re-run the seed/launch tooling against them — see `DECISIONS.md` for why these were chosen instead of left blank.

## Phase 1

4. **Guardian-required enforcement for minors is application-layer only, not a DB constraint** (see `DECISIONS.md`). Fine for the seed script's own discipline; needs to be airtight in Phase 4's real signup flow — worth a second look before real minors' data is on the platform.
5. **DQ results currently count toward rating movement** (only DNF/DNS are excluded, per literal brief wording). If disqualifications should also be rating-neutral, flag it and it's a small change.

## Phase 2

6. **`ANTHROPIC_API_KEY` is required for Path B (photo/PDF extraction) to actually work** — without it, `/api/ingest/photo` returns a clean 503 pointing at manual entry (never a crash), but the platform's primary ingest path is effectively unavailable until this is supplied.
7. **Path B has not been tested against a single real photo.** Everything about the extraction JSON schema, confidence flagging, and multi-class-per-sheet handling is implemented and covered by tests at the schema/API level, but section 3's specific test cases (a skewed phone photo, a screenshot, a PDF with three classes on one sheet) need real sample images and a live API key to actually verify. Do this before telling a track "just take a photo of your results sheet."
8. **Provenance defaults by ingest path don't yet account for who is uploading** (a track's own CSV upload should read `track_verified`, not `source_linked`) — this needs the role system from Phase 4. Revisit `lib/ingest/csv/route.ts` and the manual/photo routes' `provenanceDefault` once track-staff accounts exist.
9. **UploadThing/S3 credentials** aren't wired yet — Path B's current API accepts base64 images inline (fine for a photo of a results sheet, which isn't stored long-term the way a profile photo is); item 11 below covers the profile-photo storage gap this created in Phase 3.

## Phase 3

10. **No real object storage** — `lib/storage/local.ts` writes profile photos to local disk, which does not persist on Vercel's ephemeral filesystem in production. This is the single biggest blocker to a real deploy: supply UploadThing or S3 credentials and swap the one function in that file.
11. **The photo grade (desaturation/black-lift/warm tint) hasn't been eyeballed against a real photo** — only synthetic test images exist in this environment. Look at it against a handful of real racer photos before launch; the numbers in `lib/images/process.ts` are a reasonable first guess, not a design-reviewed final.
12. **`DOMAIN` is still the placeholder `podiumrow.example`**, which shows up literally in the sitemap, robots.txt, and OG image URLs. Swap `CONFIG.domain` once a real domain is registered — everything downstream reads from that one constant.
13. **Structured data (JSON-LD) covers Person/SportsOrganization/SportsEvent** per the DoD list, but hasn't been validated against Google's Rich Results Test — worth a pass before launch.
14. **The admin dashboard and results-import wizard remain unauthenticated dev routes** (same caveat as Phase 1's `/admin`) — real auth/role gating is Phase 4's job. Do not deploy this build's current `/admin`, `/admin/metrics`, or `/dashboard/*` routes to a public URL as-is.

## Phase 4

15. **No real auth provider credentials.** Auth.js is fully wired (Resend magic-link + Google OAuth, database sessions, role on session), but with neither `AUTH_RESEND_KEY` nor `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` set, `/sign-in` has nothing to offer — it says so plainly rather than showing a broken button. Supply one before anyone can actually sign in.
16. **Account deletion (the guardian-immediate-deletion promise in `COMPLIANCE.md` and `/for-parents`) is not built yet.** This is a real gap between what the product tells a parent and what the code does today — prioritize this before real minors' data is on the platform, not just before general launch.
17. **`/admin`'s stated ability to "read minor-involved threads" with an audit-log entry is not built** — there is no admin thread-reading UI yet at all (Phase 6's admin console). Don't claim this capability exists in any user-facing copy until it is.
18. **The messaging contact-info filter is a regex heuristic**, not a trained classifier — it will have both false positives (an innocuous number that happens to look phone-shaped) and false negatives (a cleverly obfuscated contact exchange, e.g. "five five five..." spelled out). Good enough as a first line of defense, not a guarantee. Revisit if circumvention turns out to be common.
19. **Guardian identity is self-declared at claim time** (a relationship dropdown + a consent checkbox), with no third-party ID/KYC verification — see the comment in `lib/accounts/claim.ts`. This is a real gap in "guardian verification for minors" as literally read; closing it needs an actual identity-verification service, which has its own cost/vendor decision.
20. **Message/notification emails only actually send with a `RESEND_API_KEY`** — without one, everything still lands in the in-app notification centre, but no email goes out (a console warning names each skipped send). Same missing-credential pattern as items 6 and 15.

(This file is appended to at each phase boundary as stubs, credentials, and legal-review items accumulate. See phase-boundary commits for the running list.)
