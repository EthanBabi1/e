import { boolean, doublePrecision, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";
import { zoneListings } from "./zones";
import { racers } from "./racers";
import { users } from "./users";
import { sponsorshipStatusEnum } from "./enums";

/**
 * Bids on an auction-type listing. Row-level locking against this table
 * (`SELECT ... FOR UPDATE` on the listing) is what makes bid placement
 * concurrency-safe — see lib/sponsorships/bidding.ts and
 * tests/integration/bid-concurrency.test.ts (the DoD-named test).
 */
export const bids = pgTable("bids", {
  id: idColumn(),
  listingId: text("listing_id")
    .notNull()
    .references(() => zoneListings.id, { onDelete: "cascade" }),
  sponsorUserId: text("sponsor_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amountUsd: integer("amount_usd").notNull(),
  stripeSetupIntentId: text("stripe_setup_intent_id"), // saved card, charged only if this bid wins
  // Section EXISTING CODE: "off-session charge at close, emailed payment
  // link on decline with 48 hours before rolling to the next bidder."
  // A declined bid is skipped when picking the winner on retry.
  isDeclined: boolean("is_declined").notNull().default(false),
  declinedAt: timestamp("declined_at", { withTimezone: true }),
  createdAt: createdAtColumn(),
});

/**
 * A completed sale — either a buy-now purchase or a won auction. Money
 * moves via separate charge + transfer (section 7): `chargeId` is the
 * platform-account charge, `transferId` is set only once escrow releases.
 */
export const sponsorships = pgTable("sponsorships", {
  id: idColumn(),
  listingId: text("listing_id")
    .notNull()
    .references(() => zoneListings.id, { onDelete: "restrict" }),
  racerId: text("racer_id")
    .notNull()
    .references(() => racers.id, { onDelete: "restrict" }),
  sponsorUserId: text("sponsor_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  // doublePrecision, not integer: platform fee / track share / net are
  // percentage-derived (e.g. 12% of $220 = $26.40) and routinely land on
  // a fractional cent, unlike a racer-set listing price which is always a
  // whole dollar amount by convention.
  amountUsd: doublePrecision("amount_usd").notNull(),
  platformFeeUsd: doublePrecision("platform_fee_usd").notNull(),
  trackRevShareUsd: doublePrecision("track_rev_share_usd").notNull().default(0),
  racerNetUsd: doublePrecision("racer_net_usd").notNull(),

  status: sponsorshipStatusEnum("status").notNull().default("pending_guardian_approval"),
  guardianApprovedWinnerAt: timestamp("guardian_approved_winner_at", { withTimezone: true }),

  stripeChargeId: text("stripe_charge_id"),
  stripeTransferId: text("stripe_transfer_id"),

  decalPhotoUrl: text("decal_photo_url"),
  decalUploadedAt: timestamp("decal_uploaded_at", { withTimezone: true }),
  sponsorConfirmedAt: timestamp("sponsor_confirmed_at", { withTimezone: true }),
  autoReleaseAt: timestamp("auto_release_at", { withTimezone: true }), // decalUploadedAt + 7 days
  releasedAt: timestamp("released_at", { withTimezone: true }),

  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  refundAmountUsd: doublePrecision("refund_amount_usd"),
  sponsorCreditUsd: doublePrecision("sponsor_credit_usd"),

  createdAt: createdAtColumn(),
});

export const sponsorshipAgreements = pgTable("sponsorship_agreements", {
  id: idColumn(),
  sponsorshipId: text("sponsorship_id")
    .notNull()
    .references(() => sponsorships.id, { onDelete: "cascade" }),
  termStart: text("term_start").notNull(), // date
  termEnd: text("term_end").notNull(), // date
  eventsCovered: integer("events_covered"),
  logoSpecUrl: text("logo_spec_url"),
  logoDeliveryDeadline: text("logo_delivery_deadline"), // date
  withdrawalPolicySnapshot: text("withdrawal_policy_snapshot").notNull(),
  policyVersionId: text("policy_version_id").notNull(),
  pdfUrl: text("pdf_url"),
  acceptedByRacerOrGuardianAt: timestamp("accepted_by_racer_or_guardian_at", { withTimezone: true }),
  acceptedBySponsorAt: timestamp("accepted_by_sponsor_at", { withTimezone: true }),
  createdAt: createdAtColumn(),
});

/** Flat supporter tier (section EXISTING CODE) — price set by the racer,
 * no zone attached. */
export const supporterPledges = pgTable("supporter_pledges", {
  id: idColumn(),
  racerId: text("racer_id")
    .notNull()
    .references(() => racers.id, { onDelete: "cascade" }),
  sponsorUserId: text("sponsor_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  amountUsd: integer("amount_usd").notNull(),
  stripeChargeId: text("stripe_charge_id"),
  createdAt: createdAtColumn(),
});
