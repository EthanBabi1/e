import { boolean, date, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";
import { tracks } from "./tracks";
import { racers } from "./racers";
import { ingestPathEnum, provenanceEnum, resultStatusEnum, sessionTypeEnum } from "./enums";
import { ingestBatches } from "./ingest";

export const events = pgTable("events", {
  id: idColumn(),
  trackId: text("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  date: date("date").notNull(),
  isFictionalDemo: boolean("is_fictional_demo").notNull().default(false),
  createdAt: createdAtColumn(),
});

// Named `raceSessions` (not `sessions`) to avoid colliding with the
// Auth.js `sessions` table in ./users — both are legitimately called
// "sessions" in their own domain.
export const raceSessions = pgTable("race_sessions", {
  id: idColumn(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  type: sessionTypeEnum("type").notNull(),
  className: text("class_name").notNull(),
  name: text("name"), // e.g. "Heat 2", "Final"
  createdAt: createdAtColumn(),
});

export const results = pgTable("results", {
  id: idColumn(),
  sessionId: text("session_id")
    .notNull()
    .references(() => raceSessions.id, { onDelete: "cascade" }),
  // Nullable: an unmatched name from an ingest becomes a ghost racer row
  // immediately (section 3), so in practice this is always set — but kept
  // nullable to represent a row mid-review before matching completes.
  racerId: text("racer_id").references(() => racers.id, { onDelete: "cascade" }),
  driverNameRaw: text("driver_name_raw"), // as parsed, before matching
  kartNumber: text("kart_number"),
  position: integer("position"),
  laps: integer("laps"),
  bestLapMs: integer("best_lap_ms"),
  totalTimeMs: integer("total_time_ms"),
  gapMs: integer("gap_ms"),
  status: resultStatusEnum("status").notNull().default("finished"),
  points: integer("points"),

  provenance: provenanceEnum("provenance").notNull().default("self_reported"),
  ingestPath: ingestPathEnum("ingest_path").notNull().default("manual"),
  // Upstream identifiers for idempotent re-sync/provenance tracing (section 3).
  sourceRef: jsonb("source_ref").$type<Record<string, unknown>>(),
  extractionConfidence: jsonb("extraction_confidence").$type<Record<string, number>>(),

  // The review-before-publish gate (section 3): a row parsed from a photo/
  // CSV/manual entry lands here with publishedAt = null and is invisible
  // to every public/ranked query until a human confirms it on the review
  // screen. Direct programmatic writes (seed data, an already-confirmed
  // import) pass publishedAt explicitly — see lib/ingest/shared/publish.ts.
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ingestBatchId: text("ingest_batch_id").references(() => ingestBatches.id, { onDelete: "set null" }),

  createdAt: createdAtColumn(),
});

export const laps = pgTable("laps", {
  id: idColumn(),
  resultId: text("result_id")
    .notNull()
    .references(() => results.id, { onDelete: "cascade" }),
  lapNumber: integer("lap_number").notNull(),
  lapTimeMs: integer("lap_time_ms").notNull(),
});
