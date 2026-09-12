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
9. **UploadThing/S3 credentials** aren't wired yet — Path B's current API accepts base64 images inline (fine for a photo of a results sheet, which isn't stored long-term the way a profile photo is), but real image storage for profile photos comes with the media pipeline in Phase 3.

(This file is appended to at each phase boundary as stubs, credentials, and legal-review items accumulate. See phase-boundary commits for the running list.)
