import { boolean, pgTable, text } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";
import { users } from "./users";
import { racers } from "./racers";

/**
 * Guardian accounts — HARD REQUIREMENT (brief section 2). A minor racer can
 * only exist with a row here linking them to the adult who is the legal
 * account holder. This table, not a flag on `racers`, is the thing every
 * money/consent/messaging code path checks against.
 */
export const guardians = pgTable("guardians", {
  id: idColumn(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  phone: text("phone"), // never displayed publicly, guardian's own
  createdAt: createdAtColumn(),
});

export const guardianRacers = pgTable("guardian_racers", {
  id: idColumn(),
  guardianId: text("guardian_id")
    .notNull()
    .references(() => guardians.id, { onDelete: "cascade" }),
  racerId: text("racer_id")
    .notNull()
    .references(() => racers.id, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").notNull().default(true),
  createdAt: createdAtColumn(),
});
