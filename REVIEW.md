# REVIEW.md — what you need to do before this is real

Ordered by what blocks launch soonest. Every item here is either a stub to replace, a credential to supply, or something needing legal review.

## Top of list

1. **MYLAPS/Speedhive API access is unresolved.** This build's environment could not reach `mylaps.com` at all (network egress blocked), and no public developer terms or partner program were found — see `DATA-ACCESS.md`. Path A (transponder import) is fully coded but shipped **disabled** behind `FEATURE_MYLAPS_IMPORT=false`, running against fixture data only. Before this can go live: contact MYLAPS (`support.speedhive@mylaps.com` was the only address surfaced by search) about racer-scoped API access, commercial redisplay rights, and caching terms. Until then, every real racer signs up via the photo/CSV/manual paths, which are fully functional.
2. **No existing repo was supplied** despite the brief describing one live at a Vercel URL. The racer profile, zone system, and Stripe bid flow were built fresh from the written spec in EXISTING CODE rather than lifted from real prior code/assets. If a real prior build exists, hand over its actual repo and photography/hero assets so they can replace what's here.
3. **CONFIG values are placeholders**: `PLATFORM_NAME` ("Podium Row"), `DOMAIN` (`podiumrow.example`), `LAUNCH_TRACK`/`LAUNCH_REGION` (a labeled fictional demo track, "Millhaven Kart Club (demo)"). Supply real values and re-run the seed/launch tooling against them — see `DECISIONS.md` for why these were chosen instead of left blank.

(This file is appended to at each phase boundary as stubs, credentials, and legal-review items accumulate. See phase-boundary commits for the running list.)
