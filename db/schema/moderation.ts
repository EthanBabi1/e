import { jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";
import { users } from "./users";
import { takedownStatusEnum } from "./enums";

export const logoReports = pgTable("logo_reports", {
  id: idColumn(),
  // Loosely typed target rather than a FK to sponsorships (Phase 5) so this
  // table doesn't need another migration when that table lands.
  targetType: text("target_type").notNull(), // 'zone_listing' | 'sponsorship'
  targetId: text("target_id").notNull(),
  reportedByUserId: text("reported_by_user_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason").notNull(),
  status: takedownStatusEnum("status").notNull().default("open"),
  createdAt: createdAtColumn(),
});

/** Section 13: admin impersonation and other sensitive actions are always
 * logged, "the user informed in the audit trail" per the autonomy rules. */
export const auditLog = pgTable("audit_log", {
  id: idColumn(),
  actorUserId: text("actor_user_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAtColumn(),
});
