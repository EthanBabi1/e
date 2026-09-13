ALTER TABLE "racers" ADD COLUMN "deletion_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "racers" ADD COLUMN "deleted_at" timestamp with time zone;