CREATE TABLE "zone_listings" (
	"id" text PRIMARY KEY NOT NULL,
	"zone_id" text NOT NULL,
	"listing_type" "listing_type" NOT NULL,
	"term" "listing_term" NOT NULL,
	"price_usd" integer,
	"starting_bid_usd" integer,
	"buyout_price_usd" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"guardian_approved_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" text PRIMARY KEY NOT NULL,
	"racer_id" text NOT NULL,
	"name" text NOT NULL,
	"tier" "zone_tier" NOT NULL,
	"photo_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"racer_id" text,
	"track_id" text,
	"user_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "zone_listings" ADD CONSTRAINT "zone_listings_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_racer_id_racers_id_fk" FOREIGN KEY ("racer_id") REFERENCES "public"."racers"("id") ON DELETE cascade ON UPDATE no action;