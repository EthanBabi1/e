/**
 * Single source of truth for CONFIG values from the build brief, feature flags,
 * and the live-payment-key guard. Nothing in this codebase should read
 * `process.env.STRIPE_SECRET_KEY` etc. directly outside of `lib/stripe/client.ts`,
 * which enforces the test-mode-only rule below.
 */

export const CONFIG = {
  // Placeholder values — see DECISIONS.md for why these were chosen and
  // REVIEW.md for what needs to be supplied before real launch.
  platformName: "Podium Row",
  domain: "podiumrow.example",
  ownerEmail: process.env.OWNER_EMAIL ?? "ebabil888@gmail.com",
  launchTrack: "Millhaven Kart Club (demo)",
  launchRegion: "Millhaven, OH (demo region)",
  isPlaceholderLaunchTrack: true,

  proAnnualUsd: 100,
  takeRateFree: 0.12,
  takeRatePro: 0.05,
  trackRevShare: 0.03,

  // Zone price bounds (section 4) — configurable, these are the defaults.
  zoneFloorUsd: 25,
  zoneCeilingMultiplier: 4, // hard block above suggested-range midpoint * this

  // Withdrawal policy default (section 6).
  withdrawalPolicy: "pro-rata-refund-or-credit" as const,

  // Escrow window (section 7): days a sponsor has to confirm the decal photo
  // before auto-release.
  escrowAutoReleaseDays: 7,

  // Anti-snipe extension window, from the existing build (section EXISTING CODE).
  antiSnipeWindowMinutes: 5,
  antiSnipeExtensionMinutes: 5,

  // Guardian threshold.
  minorAgeThreshold: 18,

  // Rating provisional threshold (section 8).
  ratingProvisionalThreshold: 8,
};

export const FEATURE_FLAGS = {
  // Path A (MYLAPS transponder import) — off by default. See DATA-ACCESS.md.
  mylapsImport: process.env.FEATURE_MYLAPS_IMPORT === "true",
};

/**
 * Guards against ever reading a live Stripe/payment key. Every Stripe client
 * construction goes through here. Throws rather than silently degrading,
 * because the alternative — quietly running live — is the one failure mode
 * this rule exists to prevent.
 */
export function assertTestModeKey(key: string | undefined, name: string): string {
  if (!key) {
    throw new Error(`${name} is not set. See .env.example.`);
  }
  const isTestKey = key.startsWith("sk_test_") || key.startsWith("pk_test_") || key.startsWith("rk_test_");
  if (!isTestKey) {
    throw new Error(
      `${name} does not look like a Stripe TEST key (must start with sk_test_/pk_test_/rk_test_). ` +
        `This build never uses live payment keys — see the autonomy rules in the brief.`
    );
  }
  return key;
}
