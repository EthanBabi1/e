import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";
import { tracks } from "./tracks";
import { racers } from "./racers";
import { ingestPathEnum } from "./enums";

/**
 * One "upload session" — a photo, a CSV, a manual-grid submission, or a
 * confirmed MYLAPS transponder pull — groups the draft results it produced
 * so the shared review screen (section 3) can show "all rows from this
 * batch" and publish/discard them together.
 */
export const ingestBatches = pgTable("ingest_batches", {
  id: idColumn(),
  path: ingestPathEnum("path").notNull(),
  status: text("status").notNull().default("processing"), // processing | ready_for_review | published | discarded
  trackId: text("track_id").references(() => tracks.id),
  racerId: text("racer_id").references(() => racers.id), // set for a racer-initiated import (Path A/B self-serve)
  sourceMeta: jsonb("source_meta").$type<Record<string, unknown>>(),
  createdAt: createdAtColumn(),
});

/** Path C: remember a track's column mapping so the second CSV upload is zero-config. */
export const trackIngestPreferences = pgTable("track_ingest_preferences", {
  id: idColumn(),
  trackId: text("track_id")
    .notNull()
    .unique()
    .references(() => tracks.id, { onDelete: "cascade" }),
  lastColumnMapping: jsonb("last_column_mapping").$type<Record<string, number>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Path A sync health, surfaced honestly on the racer dashboard (section 3). */
export const mylapsSyncStatus = pgTable("mylaps_sync_status", {
  id: idColumn(),
  racerId: text("racer_id")
    .notNull()
    .unique()
    .references(() => racers.id, { onDelete: "cascade" }),
  transponderNumber: text("transponder_number"),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  lastErrorMessage: text("last_error_message"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  staleNoticeEmailSentAt: timestamp("stale_notice_email_sent_at", { withTimezone: true }),
  createdAt: createdAtColumn(),
});
