import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "racer",
  "guardian",
  "sponsor",
  "track_staff",
  "admin",
]);

export const sessionTypeEnum = pgEnum("session_type", [
  "practice",
  "qualifying",
  "race",
]);

// Verification tiers — section 3. Order matters for trust display but the
// column stores the label, not a rank.
export const provenanceEnum = pgEnum("provenance", [
  "transponder_verified",
  "track_verified",
  "source_linked",
  "self_reported",
]);

export const resultStatusEnum = pgEnum("result_status", [
  "finished",
  "dnf",
  "dns",
  "dq",
]);

export const claimStatusEnum = pgEnum("claim_status", [
  "unclaimed",
  "pending",
  "claimed",
]);

export const zoneTierEnum = pgEnum("zone_tier", ["premium", "mid", "entry"]);

export const listingTypeEnum = pgEnum("listing_type", ["buy_now", "auction"]);

export const listingTermEnum = pgEnum("listing_term", ["season", "per_event"]);

export const sponsorshipStatusEnum = pgEnum("sponsorship_status", [
  "pending_guardian_approval", // winner chosen, guardian hasn't approved yet
  "charged_pending_decal", // sponsor charged to platform account, awaiting decal photo
  "awaiting_sponsor_confirmation", // decal photo uploaded, 7-day window running
  "released", // transferred to racer/guardian connected account
  "disputed",
  "refunded",
  "withdrawn",
]);

export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "free",
  "pro",
]);

export const ingestPathEnum = pgEnum("ingest_path", [
  "mylaps",
  "photo",
  "csv",
  "manual",
]);

export const notificationCategoryEnum = pgEnum("notification_category", [
  "transactional",
  "financial",
  "social",
  "digest",
]);

export const takedownStatusEnum = pgEnum("takedown_status", [
  "open",
  "resolved",
  "rejected",
]);
