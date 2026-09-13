import { boolean, doublePrecision, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";
import { users } from "./users";
import { subscriptionTierEnum } from "./enums";

export const subscriptions = pgTable("subscriptions", {
  id: idColumn(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  tier: subscriptionTierEnum("tier").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  status: text("status").notNull().default("active"), // 'active' | 'past_due' | 'canceled'
  createdAt: createdAtColumn(),
});

/**
 * Section 7: "Each racer or guardian gets a connected account. Tracks
 * receiving revenue share need one too." `ownerType`/`ownerId` rather than
 * three separate FK columns — the owner is always exactly one of a
 * guardian, an adult racer, or a track, never more than one at a time.
 */
export const connectAccounts = pgTable("connect_accounts", {
  id: idColumn(),
  ownerType: text("owner_type").notNull(), // 'guardian' | 'racer' | 'track'
  ownerId: text("owner_id").notNull(),
  stripeAccountId: text("stripe_account_id").notNull(),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: createdAtColumn(),
});

export const payouts = pgTable("payouts", {
  id: idColumn(),
  connectAccountId: text("connect_account_id")
    .notNull()
    .references(() => connectAccounts.id),
  amountUsd: doublePrecision("amount_usd").notNull(), // can carry cents, same as sponsorships' derived fields
  kind: text("kind").notNull(), // 'sponsorship' | 'track_rev_share'
  sponsorshipId: text("sponsorship_id"),
  stripeTransferId: text("stripe_transfer_id"),
  createdAt: createdAtColumn(),
});
