import { boolean, doublePrecision, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";
import { racers } from "./racers";
import { results } from "./events";

/**
 * Per racer, per class. `mu`/`sigma` are the Elo-style rating and its
 * uncertainty (section 8) — displayed as "mu ± sigma*confidenceZ", never a
 * bare number. Hidden entirely (isProvisional=true) until
 * rankedResultCount >= CONFIG.ratingProvisionalThreshold.
 */
export const ratings = pgTable(
  "ratings",
  {
    id: idColumn(),
    racerId: text("racer_id")
      .notNull()
      .references(() => racers.id, { onDelete: "cascade" }),
    className: text("class_name").notNull(),
    mu: doublePrecision("mu").notNull().default(1400),
    sigma: doublePrecision("sigma").notNull().default(300),
    rankedResultCount: integer("ranked_result_count").notNull().default(0),
    isProvisional: boolean("is_provisional").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.racerId, table.className)]
);

export const ratingHistory = pgTable("rating_history", {
  id: idColumn(),
  ratingId: text("rating_id")
    .notNull()
    .references(() => ratings.id, { onDelete: "cascade" }),
  resultId: text("result_id").references(() => results.id, { onDelete: "set null" }),
  muBefore: doublePrecision("mu_before").notNull(),
  muAfter: doublePrecision("mu_after").notNull(),
  sigmaBefore: doublePrecision("sigma_before").notNull(),
  sigmaAfter: doublePrecision("sigma_after").notNull(),
  createdAt: createdAtColumn(),
});
