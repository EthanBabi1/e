import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";
import { users } from "./users";
import { notificationCategoryEnum } from "./enums";

export const notifications = pgTable("notifications", {
  id: idColumn(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: notificationCategoryEnum("category").notNull(),
  type: text("type").notNull(), // e.g. 'new_pb', 'outbid', 'payout_released' — see lib/notifications/events.ts
  title: text("title").notNull(),
  body: text("body"),
  linkUrl: text("link_url"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: createdAtColumn(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: idColumn(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: notificationCategoryEnum("category").notNull(),
  emailEnabled: boolean("email_enabled").notNull().default(true),
});
