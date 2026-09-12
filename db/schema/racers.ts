import { boolean, date, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";
import { users } from "./users";
import { tracks } from "./tracks";
import { claimStatusEnum } from "./enums";

export const racers = pgTable("racers", {
  id: idColumn(),
  slug: text("slug").notNull().unique(),
  userId: text("user_id").references(() => users.id), // null until claimed
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  // Stored always (needed for internal matching/claim verification); NEVER
  // rendered directly — every read path goes through lib/minors/redact.ts.
  dob: date("dob"),
  // Denormalized, recomputed on every write via lib/minors — lets every
  // query filter/redact without joining + computing age each time.
  isMinor: boolean("is_minor").notNull().default(true),
  ageInferredFromClass: boolean("age_inferred_from_class").notNull().default(false),

  numberDefault: text("number_default"),
  classDefault: text("class_default"),
  homeTrackId: text("home_track_id").references(() => tracks.id),

  bio: text("bio"),
  story: text("story"),
  seasonGoal: text("season_goal"),

  socialFollowingSelfReported: integer("social_following_self_reported"),
  trackdayAttendanceSelfReported: integer("trackday_attendance_self_reported"),

  claimStatus: claimStatusEnum("claim_status").notNull().default("unclaimed"),
  minorDisplayConsentAt: timestamp("minor_display_consent_at", { withTimezone: true }),

  town: text("town"), // redacted for unclaimed/minor per COMPLIANCE.md
  photoUrl: text("photo_url"),

  proUntil: timestamp("pro_until", { withTimezone: true }), // denormalized cache of subscriptions.currentPeriodEnd for fast reads

  isFictionalDemo: boolean("is_fictional_demo").notNull().default(false),
  createdAt: createdAtColumn(),
});
