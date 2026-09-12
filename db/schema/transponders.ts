import { date, pgTable, text } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";
import { racers } from "./racers";

export const transponders = pgTable("transponders", {
  id: idColumn(),
  number: text("number").notNull().unique(),
  notes: text("notes"),
  createdAt: createdAtColumn(),
});

/** Date-ranged binding — a transponder can change hands (section 3). */
export const transponderAssignments = pgTable("transponder_assignments", {
  id: idColumn(),
  transponderId: text("transponder_id")
    .notNull()
    .references(() => transponders.id, { onDelete: "cascade" }),
  racerId: text("racer_id")
    .notNull()
    .references(() => racers.id, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // null = current holder
  createdAt: createdAtColumn(),
});
