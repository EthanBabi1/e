CREATE TABLE "ingest_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"path" "ingest_path" NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"track_id" text,
	"racer_id" text,
	"source_meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mylaps_sync_status" (
	"id" text PRIMARY KEY NOT NULL,
	"racer_id" text NOT NULL,
	"transponder_number" text,
	"last_success_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"last_error_message" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"stale_notice_email_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mylaps_sync_status_racer_id_unique" UNIQUE("racer_id")
);
--> statement-breakpoint
CREATE TABLE "track_ingest_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"last_column_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "track_ingest_preferences_track_id_unique" UNIQUE("track_id")
);
--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "ingest_batch_id" text;--> statement-breakpoint
ALTER TABLE "ingest_batches" ADD CONSTRAINT "ingest_batches_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingest_batches" ADD CONSTRAINT "ingest_batches_racer_id_racers_id_fk" FOREIGN KEY ("racer_id") REFERENCES "public"."racers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mylaps_sync_status" ADD CONSTRAINT "mylaps_sync_status_racer_id_racers_id_fk" FOREIGN KEY ("racer_id") REFERENCES "public"."racers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_ingest_preferences" ADD CONSTRAINT "track_ingest_preferences_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_ingest_batch_id_ingest_batches_id_fk" FOREIGN KEY ("ingest_batch_id") REFERENCES "public"."ingest_batches"("id") ON DELETE set null ON UPDATE no action;