import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { idColumn, createdAtColumn } from "./columns.helpers";
import { racers } from "./racers";
import { listingTermEnum, listingTypeEnum, zoneTierEnum } from "./enums";

/**
 * The zone model from the existing build (section EXISTING CODE / 4):
 * 10 named placement areas across kart/helmet/suit, each with a tier and a
 * photo. Display/pricing schema lands here in Phase 3 (marketplace is a
 * public-surface concern); bids/checkout/escrow are Phase 5 — see
 * db/schema/sponsorships.ts, added then.
 */
export const zones = pgTable("zones", {
  id: idColumn(),
  racerId: text("racer_id")
    .notNull()
    .references(() => racers.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "Nose Cone", "Side Pod Left", "Helmet Visor Strip"
  tier: zoneTierEnum("tier").notNull(),
  photoUrl: text("photo_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAtColumn(),
});

export const zoneListings = pgTable("zone_listings", {
  id: idColumn(),
  zoneId: text("zone_id")
    .notNull()
    .references(() => zones.id, { onDelete: "cascade" }),
  listingType: listingTypeEnum("listing_type").notNull(),
  term: listingTermEnum("term").notNull(),
  priceUsd: integer("price_usd"), // buy-now price
  startingBidUsd: integer("starting_bid_usd"), // auction floor
  buyoutPriceUsd: integer("buyout_price_usd"), // auction buy-out
  isActive: boolean("is_active").notNull().default(true),
  // Guardian must approve before a minor's listing goes public (section 2)
  // — Phase 3 shows the schema/gate; the guardian dashboard that sets this
  // lands in Phase 4.
  guardianApprovedAt: timestamp("guardian_approved_at", { withTimezone: true }),
  closesAt: timestamp("closes_at", { withTimezone: true }), // auctions only
  createdAt: createdAtColumn(),
});
