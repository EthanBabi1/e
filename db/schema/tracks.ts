import { boolean, doublePrecision, pgTable, text } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";
import { users } from "./users";

export const tracks = pgTable("tracks", {
  id: idColumn(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  // Every seeded/demo track MUST be flagged — rule 4 (no invented data
  // presented as real). Real tracks claimed by a real track operator are
  // false here.
  isFictionalDemo: boolean("is_fictional_demo").notNull().default(false),
  city: text("city"),
  region: text("region"),
  country: text("country").default("US"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  photoUrl: text("photo_url"),
  layoutMapUrl: text("layout_map_url"),
  claimedByUserId: text("claimed_by_user_id").references(() => users.id),
  freeFirstYear: boolean("free_first_year").notNull().default(false),
  createdAt: createdAtColumn(),
});

export const trackStaff = pgTable("track_staff", {
  id: idColumn(),
  trackId: text("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("staff"),
  createdAt: createdAtColumn(),
});
