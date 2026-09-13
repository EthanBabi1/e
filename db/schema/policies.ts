import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";
import { users } from "./users";

/**
 * Section 12: "Version every policy and store which version each user
 * accepted, with a timestamp." Includes the minor-display-consent policy
 * referenced in section 2 (separate plain-language consent at claim time),
 * not just the general legal pages.
 */
export const policyVersions = pgTable("policy_versions", {
  id: idColumn(),
  slug: text("slug").notNull(), // 'terms' | 'privacy' | 'sponsorship-terms' | 'minor-display-consent' | ...
  version: text("version").notNull(),
  bodyMarkdown: text("body_markdown").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
});

export const policyAcceptances = pgTable("policy_acceptances", {
  id: idColumn(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  policyVersionId: text("policy_version_id")
    .notNull()
    .references(() => policyVersions.id),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAtColumn(),
});
