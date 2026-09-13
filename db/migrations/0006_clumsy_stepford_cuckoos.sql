ALTER TABLE "bids" ADD COLUMN "is_declined" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN "declined_at" timestamp with time zone;