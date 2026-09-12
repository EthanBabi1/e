import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";
import { racers } from "./racers";
import { users } from "./users";

export const claims = pgTable("claims", {
  id: idColumn(),
  racerId: text("racer_id")
    .notNull()
    .references(() => racers.id, { onDelete: "cascade" }),
  claimedByUserId: text("claimed_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  verifiedVia: text("verified_via").notNull(), // 'email' | 'track_confirmation' | 'guardian_verification'
  isGuardianClaim: boolean("is_guardian_claim").notNull().default(false),
  createdAt: createdAtColumn(),
});

export const claimInvitations = pgTable("claim_invitations", {
  id: idColumn(),
  racerId: text("racer_id")
    .notNull()
    .references(() => racers.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  createdAt: createdAtColumn(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

/** Public no-account takedown request for an unclaimed profile (section 3). */
export const takedownRequests = pgTable("takedown_requests", {
  id: idColumn(),
  racerId: text("racer_id").references(() => racers.id, { onDelete: "cascade" }),
  requestedByEmail: text("requested_by_email").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("open"),
  createdAt: createdAtColumn(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});
