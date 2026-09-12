import { jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";

/**
 * Section 13: "instrumented from the first user action." A single
 * append-only event log is enough at this scale — the admin dashboard
 * aggregates over it rather than maintaining separate funnel-stage
 * counters that can drift out of sync with what actually happened.
 * `eventType` values are documented in lib/analytics/events.ts.
 */
export const analyticsEvents = pgTable("analytics_events", {
  id: idColumn(),
  eventType: text("event_type").notNull(),
  racerId: text("racer_id"),
  trackId: text("track_id"),
  userId: text("user_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAtColumn(),
});
