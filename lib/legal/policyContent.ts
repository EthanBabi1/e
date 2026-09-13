import { CONFIG } from "@/lib/config";

/**
 * Section 12: real routes with real (placeholder) content, versioned.
 * Every entry here is exactly what section 12 asks for and nothing more —
 * "Write placeholder copy, mark it clearly as requiring legal review, and
 * never invent specific legal or regulatory claims." Nothing below cites a
 * specific statute, jurisdiction, or regulatory body.
 */
export interface PolicyDoc {
  slug: string;
  version: string;
  title: string;
  needsLegalReview: boolean;
  body: string;
}

export const POLICIES: PolicyDoc[] = [
  {
    slug: "terms",
    version: "v1",
    title: "Terms of Service",
    needsLegalReview: true,
    body: `These are placeholder terms of service for ${CONFIG.platformName}, a platform connecting grassroots kart racers with local sponsors, and giving tracks free results and championship tools.

By using this platform you agree to keep your account information accurate, to use the messaging system respectfully, and to only list sponsorship zones you're actually entitled to sell. Fees are described in full at /fees.

This document is a placeholder. It has not been reviewed by a lawyer and should not be relied on as a real terms-of-service agreement until it has been.`,
  },
  {
    slug: "privacy",
    version: "v1",
    title: "Privacy Policy",
    needsLegalReview: true,
    body: `We collect the information needed to run this platform: your account details, race results tied to your transponder or entered manually, messages you send through the platform, and payment information processed by our payment provider (we never see full card numbers).

We never sell your data. Location data (GPS) is stripped from every photo you upload, automatically, before it's stored. Anyone under 18 has additional protections described at /for-parents.

You can request your full results record as a CSV or PDF export at any time. You can request deletion of your account; see /for-parents for how this works for a minor's account.

This document is a placeholder. It has not been reviewed by a lawyer and should not be relied on as a real privacy policy until it has been.`,
  },
  {
    slug: "sponsorship-terms",
    version: "v1",
    title: "Sponsorship Terms",
    needsLegalReview: true,
    body: `When you sponsor a racer's zone, you're buying a defined placement (with photo reference and dimensions) for a defined term (a season or a set number of events), with a logo delivery deadline agreed at checkout.

**Withdrawal policy.** If a racer stops competing before the end of a season-long term, you receive a pro-rata refund of the unserved portion of your sponsorship, or — if you'd rather stay connected to the racer — a sponsor credit toward a future season, at your choice.

**Logo rights.** By uploading a logo, you confirm you own it or are licensed to use it. Report a logo you believe is used without permission from any listing page.

**Fees.** ${CONFIG.platformName} takes a percentage of each sponsorship (see /fees); the rest goes to the racer (or, for a minor, their guardian's account) and, where a track is enrolled in revenue share, a portion to the track.

This document is a placeholder. It has not been reviewed by a lawyer and should not be relied on as a real sponsorship agreement until it has been.`,
  },
  {
    slug: "for-parents",
    version: "v1",
    title: "For Parents & Guardians",
    needsLegalReview: false,
    body: `If your child races karts, here's exactly how this platform works for them.

**You hold the account, not your child.** Every racer under 18 is linked to a guardian account — yours. Any payout from a sponsorship goes to your connected bank account, never to a login your child controls.

**Nothing sensitive is public.** Your child's exact birthdate, school, address, phone number and email are never shown publicly, no matter what. Age is shown only as a number, if at all.

**You approve everything before it's public.** A listing for your child's kart doesn't go live until you approve it — and if it sells, you also approve the winning sponsor before any money moves.

**Sponsors can't message your child directly.** Every message to your child's profile comes to you. Your child's own account (if they have one) never receives a sponsor's message.

**You can delete everything, any time.** Unlike some other platforms, we say plainly: we will never delete your child's race record — only you can. If you ask us to delete their account, we do it immediately and completely, not after some waiting period.

**Before anything about your child is shown publicly** — their name, a photo, their results — we ask you to separately confirm you're comfortable with that, in plain language, not buried in a long terms-of-service document.

If any of this doesn't match what you see on the platform, that's a bug — tell us.`,
  },
  {
    slug: "verification",
    version: "v1",
    title: "What each verification tier means",
    needsLegalReview: false,
    body: `Every result on this platform carries one of four labels:

**Transponder-verified.** Imported directly from timing-system data tied to the racer's own transponder. The highest tier — a lap either exists in the timing data or it doesn't, so this can't be invented.

**Track-verified.** Published by the track's own official account.

**Source-linked.** Imported from a results file or page the track or racer published elsewhere; the original source is kept on file.

**Self-reported.** Entered by the racer themselves, with no independent source. Clearly marked as such everywhere it appears, and excluded from official leaderboards and driver ratings.

Only the first three tiers count toward anything ranked — a leaderboard position, a driver rating, or a track record.`,
  },
  {
    slug: "rating",
    version: "v1",
    title: "How the driver rating works",
    needsLegalReview: false,
    body: `The rating is Elo-style: every race updates a driver's rating based on who they beat and lost to, weighted by how strong the field was.

A few specifics:

- Only transponder-verified, track-verified, and source-linked results count. Self-reported results never move a rating.
- DNF and DNS don't count against you — a mechanical failure isn't a reflection of driving.
- The rating is hidden and marked provisional until a driver has enough ranked results for it to mean something (currently 8). Below that, it's visible only to the driver and their guardian, never publicly.
- Once public, it's always shown as a range (like "1420 ± 85"), never a bare number — the range narrows as more results come in.
- A win in a big field moves your rating differently than a win in a small one, because beating more people is a stronger result.

This rating never appears on a public profile as a way to rank a minor's commercial worth — see /for-parents.`,
  },
  {
    slug: "fees",
    version: "v1",
    title: "Fees",
    needsLegalReview: false,
    body: `**Free tier.** ${CONFIG.platformName} takes ${Math.round(CONFIG.takeRateFree * 100)}% of every sponsorship you sell.

**Pro ($${CONFIG.proAnnualUsd}/year).** Drops the platform's cut to ${Math.round(CONFIG.takeRatePro * 100)}%, and adds a custom profile URL, a media kit generator, sponsor analytics, and marketplace priority.

Pro pays for itself once you're selling enough sponsorship that the ${Math.round((CONFIG.takeRateFree - CONFIG.takeRatePro) * 100)}-point difference in take rate exceeds the $${CONFIG.proAnnualUsd} annual price — your dashboard shows this calculated against your own actual sales, and will tell you honestly if you're better off staying on the free tier.

**Tracks are always free.** A track enrolled in revenue share receives ${Math.round(CONFIG.trackRevShare * 100)}% of the sponsorship revenue generated by racers at that track.

There is no fee to have a profile, import results, or browse the marketplace. Fees only apply to completed sponsorship sales.`,
  },
];

// Not a public route — presented as a checkbox at guardian claim time
// (section 2's "separate plain-language consent at signup").
export const MINOR_DISPLAY_CONSENT: PolicyDoc = {
  slug: "minor-display-consent",
  version: "v1",
  title: "Consent to display your child's name, photo and results",
  needsLegalReview: true,
  body: `I am this racer's parent or legal guardian. I understand that by confirming this, my child's first name and last name, a photo I choose to upload, their race results, and their class will be shown publicly on this platform. I understand I can withdraw this at any time by requesting deletion, which this platform will act on immediately.`,
};

export function getPolicy(slug: string): PolicyDoc | null {
  return POLICIES.find((p) => p.slug === slug) ?? null;
}
