# COMPLIANCE.md — minors, privacy, legal surface

This is the enforceable contract for every fixed rule in the brief's sections 2, 3 and 6. Anything marked **[LEGAL REVIEW]** must go to an actual lawyer before launch — nothing in this file is legal advice.

## Minor protection — single source of truth

`lib/minors/index.ts` exports `isMinorProfile(racer)` and every redaction helper. No component or query computes "is this a minor" independently — this is deliberate: a scattered check is how a rule like this quietly breaks six months from now when someone adds a new profile card.

Rules enforced, and where:

**Correction from an earlier draft of this file**: a *ghost* profile (unclaimed, created from a track's or a racer's ingest) legitimately exists with **no guardian at all** — nobody has an account yet. The guardian requirement below applies from the moment a minor's profile is claimed, or before any listing goes public, message is sent, or money moves — not to the bare existence of an unclaimed row. `lib/minors/inferAge.ts` and the ghost-profile creation path (`lib/ingest/shared/ghostRacer.ts`) never create a guardian; `lib/accounts/claim.ts` (Phase 4) does, as part of claiming.

| Rule | Enforced in | Status |
|---|---|---|
| Under-18 racer, once claimed, is under a guardian account; guardian is the legal account holder | `lib/accounts/claim.ts` → `claimAsGuardian()` creates the `guardian_racers` row as part of the claim, in the same call | Built (Phase 4) |
| Stripe Connect account belongs to guardian, never minor | `lib/stripe/connect.ts` — to take a `guardianId`, no path accepting a minor's id | Not yet built — Phase 5 |
| No email/phone/address/DOB/school shown for under-18 | `lib/minors/redact.ts`, applied before any profile payload leaves the server (`ghostProfileView`/`claimedProfileView`) | Built (Phase 1) |
| Age shown as number/bracket only, never DOB | `lib/minors/redact.ts` → `ageDisplay()` | Built (Phase 1) |
| Sponsors cannot message a minor directly | `lib/messaging/threads.ts` → `getOrCreateThread()` resolves `guardianUserId` from the racer's linked guardian at thread creation; `sendMessage`'s notification goes to that id, never the racer's; UI states this in `app/dashboard/messages/[threadId]/page.tsx` and `components/profile/EnquiryForm.tsx` | Built (Phase 4) |
| Contact-detail filtering in threads involving a minor | `lib/messaging/filter.ts` — regex scan for phone/email/handles/social mentions, blocks the whole send with an explanation, never silently strips; only applied when `isMinorThread()` is true | Built (Phase 4) |
| Guardian approves listing before public, and winner before funds move | `zone_listings.guardianApprovedAt` gates public visibility (checked in `lib/marketplace/getListings.ts` and `lib/profile/getProfileData.ts`); the winner-approval gate on fund release is schema-ready (`sponsorships.guardianApprovedAt`, Phase 5) but the escrow flow itself isn't built yet | Listing gate built (Phase 3/4); winner-approval gate — Phase 5 |
| Separate consent for public display of a minor's name/photo/results | `lib/accounts/claim.ts` → `claimAsGuardian()` inserts a `policy_acceptances` row against the `minor-display-consent` policy version as part of the claim transaction; the claim UI shows the full consent text before the checkbox can be checked | Built (Phase 4) |
| No full name, photo, town, age, social links for an unclaimed minor's ghost profile | `lib/minors/redact.ts` → `ghostProfileView()`, used by every route that renders a racer (profile, track roster, search, sitemap) — never the raw record | Built (Phase 1) |
| `noindex`, excluded from sitemap | `app/racers/[slug]/page.tsx` reads `view.noindex`; `app/sitemap.ts` filters racers through the same `racerPublicView().noindex` field — one source of truth, not two | Built (Phase 3) |
| No share cards for unclaimed minor | `app/api/og/racer/[slug]/route.tsx` returns 403 via `canGenerateShareCard()` | Built (Phase 3) |
| No financial email to a minor | `lib/notifications/dispatch.ts` — `sendFinancialNotification()` takes a bare user id (never a racer id), and `sendFinancialNotificationForRacer()` is the only path that starts from a racer id: it resolves a minor to their guardian's user id and refuses to proceed if none is on file, so there is no calling convention that reaches a minor's own address for the `financial` category. Covered by `tests/integration/notifications-minor-financial.test.ts` (the DoD test named in section 16) | Built + tested (Phase 4) |
| Admin can read minor-involved threads, stated in UI | Thread banner built; admin's own read access + the audit-log entry on viewing one is not yet built | Not yet built — Phase 6 admin console |
| Full retention of minor-involved messages | No deletion path exists for `messages` at all yet (nothing in the product deletes a message) | Holds by omission — revisit when a deletion flow is built |
| Deletion request from guardian executes immediately, not the 90-day hold | `lib/accounts/deletion.ts` | Not yet built — flagged in `REVIEW.md` |
| Age-unknown treated as minor until claim proves otherwise; junior/cadet classes are minors by definition | `lib/minors/inferAge.ts` | Built (Phase 1) |

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
