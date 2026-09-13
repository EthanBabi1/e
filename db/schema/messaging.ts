import { boolean, pgTable, text } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";
import { racers } from "./racers";
import { users } from "./users";
import { zoneListings } from "./zones";

/**
 * Section 6: "For any under-18 racer the thread is with the guardian. The
 * racer account never receives direct sponsor messages." `guardianUserId`
 * is set at thread-creation time from the racer's current guardian — once
 * set it's the actual message recipient, not just a display label.
 */
export const messageThreads = pgTable("message_threads", {
  id: idColumn(),
  racerId: text("racer_id")
    .notNull()
    .references(() => racers.id, { onDelete: "cascade" }),
  zoneListingId: text("zone_listing_id").references(() => zoneListings.id, { onDelete: "set null" }),
  sponsorUserId: text("sponsor_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  guardianUserId: text("guardian_user_id").references(() => users.id), // set iff the racer is a minor
  createdAt: createdAtColumn(),
});

export const messages = pgTable("messages", {
  id: idColumn(),
  threadId: text("thread_id")
    .notNull()
    .references(() => messageThreads.id, { onDelete: "cascade" }),
  senderUserId: text("sender_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  // Section 6: "detect phone numbers, email addresses and social handles,
  // and block them... never strip silently." True when this exact send
  // was blocked for containing contact info.
  wasBlockedForContactInfo: boolean("was_blocked_for_contact_info").notNull().default(false),
  createdAt: createdAtColumn(),
});

export const threadReports = pgTable("thread_reports", {
  id: idColumn(),
  threadId: text("thread_id")
    .notNull()
    .references(() => messageThreads.id, { onDelete: "cascade" }),
  reportedByUserId: text("reported_by_user_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason"),
  createdAt: createdAtColumn(),
});

export const userBlocks = pgTable("user_blocks", {
  id: idColumn(),
  blockerUserId: text("blocker_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  blockedUserId: text("blocked_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: createdAtColumn(),
});
