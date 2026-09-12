import { text, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

/** Portable id column — nanoid generated in application code, no DB
 * extension dependency (works identically on local Postgres and Neon). */
export const idColumn = () => text("id").primaryKey().$defaultFn(() => nanoid());

export const createdAtColumn = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const updatedAtColumn = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
