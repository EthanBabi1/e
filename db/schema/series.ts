import { integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";
import { tracks } from "./tracks";
import { events } from "./events";

export const series = pgTable("series", {
  id: idColumn(),
  trackId: text("track_id").references(() => tracks.id),
  name: text("name").notNull(),
  seasonYear: integer("season_year").notNull(),
  classes: jsonb("classes").$type<string[]>().notNull().default([]),
  pointsSystem: jsonb("points_system").$type<Record<string, number>>().notNull().default({}),
  dropScores: integer("drop_scores").notNull().default(0),
  createdAt: createdAtColumn(),
});

export const seriesRounds = pgTable("series_rounds", {
  id: idColumn(),
  seriesId: text("series_id")
    .notNull()
    .references(() => series.id, { onDelete: "cascade" }),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  roundNumber: integer("round_number").notNull(),
});

/** Admin-managed championship/class sponsorship (section 7, revenue line 3). */
export const seriesSponsorships = pgTable("series_sponsorships", {
  id: idColumn(),
  seriesId: text("series_id")
    .notNull()
    .references(() => series.id, { onDelete: "cascade" }),
  className: text("class_name"), // null = whole series
  sponsorOrgName: text("sponsor_org_name").notNull(),
  rateUsd: integer("rate_usd").notNull(),
  splitPlatformPct: integer("split_platform_pct").notNull(),
  splitTrackPct: integer("split_track_pct").notNull(),
  splitRacersPct: integer("split_racers_pct").notNull(),
  status: text("status").notNull().default("sold"), // 'available' | 'sold'
  createdAt: createdAtColumn(),
});
