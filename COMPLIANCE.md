# COMPLIANCE.md — minors, privacy, legal surface

This is the enforceable contract for every fixed rule in the brief's sections 2, 3 and 6. Anything marked **[LEGAL REVIEW]** must go to an actual lawyer before launch — nothing in this file is legal advice.

## Minor protection — single source of truth

`lib/minors/index.ts` exports `isMinorProfile(racer)` and every redaction helper. No component or query computes "is this a minor" independently — this is deliberate: a scattered check is how a rule like this quietly breaks six months from now when someone adds a new profile card.

Rules enforced, and where:

**Correction from an earlier draft of this file**: a *ghost* profile (unclaimed, created from a track's or a racer's ingest) legitimately exists with **no guardian at all** — nobody has an account yet. The guardian requirement below applies from the moment a minor's profile is claimed, or before any listing goes public, message is sent, or money moves — not to the bare existence of an unclaimed row. `lib/minors/inferAge.ts` and the ghost-profile creation path (`lib/ingest/shared/ghostRacer.ts`) never create a guardian; `lib/accounts/claim.ts` (Phase 4) does, as part of claiming.

| Rule | Enforced in |
|---|---|
| Under-18 racer, once claimed, is under a guardian account; guardian is the legal account holder | Claim flow (Phase 4) creates the `guardian_racers` row transactionally with the claim; `zone_listings`/`sponsorships` gate on a guardian existing before going public (Phase 5) |
| Stripe Connect account belongs to guardian, never minor | `lib/stripe/connect.ts` — `createConnectAccount` takes a `guardianId`, has no code path accepting a minor's id |
| No email/phone/address/DOB/school shown for under-18 | `lib/minors/redact.ts`, applied at the query-serialization boundary before any profile payload leaves the server |
| Age shown as number/bracket only, never DOB | `lib/minors/redact.ts` → `ageDisplay()` |
| Sponsors cannot message a minor directly | `lib/messaging/threads.ts` routes any thread on a minor's zone to `guardianId`, not `racerId`; UI states this to both sides in `components/messaging/ThreadHeader.tsx` |
| Contact-detail filtering in threads involving a minor | `lib/messaging/filter.ts` — regex + heuristic scan for phone/email/handles, blocks with an explanation, never silently strips |
| Guardian approves listing before public, and winner before funds move | `zone_listings.guardian_approved_at` gates public visibility; `sponsorships.guardian_approved_at` gates the escrow-release cron from ever firing a transfer |
| Separate consent for public display of a minor's name/photo/results | `policy_acceptances` row with `policy_slug = 'minor-display-consent'`, required before a minor's profile can be un-ghosted |
| No full name, photo, town, age, social links for an unclaimed minor's ghost profile | `lib/minors/redact.ts` → `ghostProfileView()`, used by every ghost-profile route, never the raw record |
| `noindex`, excluded from sitemap | `app/racers/[slug]/page.tsx` sets `robots: { index: false }` when `isMinorProfile && !claimed`; `app/sitemap.ts` filters the same predicate |
| No share cards for unclaimed minor | `app/api/og/[type]/[id]/route.ts` returns 403 for that combination |
| No financial email to a minor | `lib/notifications/dispatch.ts` — every notification with `category: 'financial'` resolves its recipient through `resolveRecipient()`, which substitutes the guardian's address for any minor racer and cannot be called with the racer's raw email for that category (enforced by type: financial notifications take a `GuardianRecipient`, not a `Recipient` union) |
| Admin can read minor-involved threads, stated in UI | `components/messaging/ThreadHeader.tsx` banner + `audit_log` entry on every admin thread view |
| Full retention of minor-involved messages | messages table has no minor-specific deletion path; deletion cascades only via the explicit guardian-deletion flow below |
| Deletion request from guardian executes immediately, not the 90-day hold | `lib/accounts/deletion.ts` — `requestDeletion({ requestedByGuardianOf: minorId })` takes the immediate branch; all other deletions take the 90-day hold+restore branch |
| Age-unknown treated as minor until claim proves otherwise; junior/cadet classes are minors by definition | `lib/minors/inferAge.ts` |

## Data retention and export

- Full CSV/PDF export, one click, any tier, any time — `app/dashboard/results/export` — never gated behind Pro.
- Public wording: "we will never delete your record — only you can." Implemented at `/for-parents` and `/terms`.
- Deleted accounts: 90-day hold + restore, then purge, **except** guardian-requested minor deletions, which are immediate.
- Sponsorship transaction records retained only as long as tax/payment obligations require **[LEGAL REVIEW: exact retention period — placeholder of 7 years used, matching common US tax record-keeping guidance, not verified against current IRS rules or the platform's actual jurisdiction]**.

## Ghost profiles — removal on request

`/remove` — public, no account required, admin-notified immediately, 48-hour SLA, every request logged in `takedown_requests`.

## Legal pages

All of `/terms`, `/privacy`, `/sponsorship-terms`, `/for-parents`, `/verification`, `/rating`, `/fees` are real routes (Phase 4/6) with placeholder copy, each stamped **"Placeholder — requires legal review before launch"** in a visible banner, and each version recorded in `policy_versions` with per-user `policy_acceptances` timestamps.

## Explicitly out of scope for this build (flagged, not silently skipped)

- COPPA/state-specific minor-data-privacy statutory analysis **[LEGAL REVIEW]** — the rules above are a good-faith product implementation of the brief's stated requirements, not a compliance certification.
- Sales tax / marketplace facilitator obligations on sponsorship transactions **[LEGAL REVIEW]**.
- Stripe Connect Express onboarding's own KYC requirements for a guardian acting on a minor's behalf — implemented as "guardian completes standard Connect onboarding," not specially adapted, because Stripe does not offer a minor-specific onboarding mode; flagged in `REVIEW.md`.
