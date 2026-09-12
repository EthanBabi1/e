CREATE TYPE "public"."claim_status" AS ENUM('unclaimed', 'pending', 'claimed');--> statement-breakpoint
CREATE TYPE "public"."ingest_path" AS ENUM('mylaps', 'photo', 'csv', 'manual');--> statement-breakpoint
CREATE TYPE "public"."listing_term" AS ENUM('season', 'per_event');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('buy_now', 'auction');--> statement-breakpoint
CREATE TYPE "public"."notification_category" AS ENUM('transactional', 'financial', 'social', 'digest');--> statement-breakpoint
CREATE TYPE "public"."provenance" AS ENUM('transponder_verified', 'track_verified', 'source_linked', 'self_reported');--> statement-breakpoint
CREATE TYPE "public"."result_status" AS ENUM('finished', 'dnf', 'dns', 'dq');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('practice', 'qualifying', 'race');--> statement-breakpoint
CREATE TYPE "public"."sponsorship_status" AS ENUM('pending_guardian_approval', 'charged_pending_decal', 'awaiting_sponsor_confirmation', 'released', 'disputed', 'refunded', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "public"."takedown_status" AS ENUM('open', 'resolved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('racer', 'guardian', 'sponsor', 'track_staff', 'admin');--> statement-breakpoint
CREATE TYPE "public"."zone_tier" AS ENUM('premium', 'mid', 'entry');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"role" "user_role" DEFAULT 'racer' NOT NULL,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "guardian_racers" (
	"id" text PRIMARY KEY NOT NULL,
	"guardian_id" text NOT NULL,
	"racer_id" text NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_staff" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"is_fictional_demo" boolean DEFAULT false NOT NULL,
	"city" text,
	"region" text,
	"country" text DEFAULT 'US',
	"lat" double precision,
	"lng" double precision,
	"photo_url" text,
	"layout_map_url" text,
	"claimed_by_user_id" text,
	"free_first_year" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tracks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "racers" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"user_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"dob" date,
	"is_minor" boolean DEFAULT true NOT NULL,
	"age_inferred_from_class" boolean DEFAULT false NOT NULL,
	"number_default" text,
	"class_default" text,
	"home_track_id" text,
	"bio" text,
	"story" text,
	"season_goal" text,
	"social_following_self_reported" integer,
	"trackday_attendance_self_reported" integer,
	"claim_status" "claim_status" DEFAULT 'unclaimed' NOT NULL,
	"minor_display_consent_at" timestamp with time zone,
	"town" text,
	"photo_url" text,
	"pro_until" timestamp with time zone,
	"is_fictional_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "racers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "transponder_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"transponder_id" text NOT NULL,
	"racer_id" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transponders" (
	"id" text PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transponders_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"is_fictional_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "laps" (
	"id" text PRIMARY KEY NOT NULL,
	"result_id" text NOT NULL,
	"lap_number" integer NOT NULL,
	"lap_time_ms" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "race_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"type" "session_type" NOT NULL,
	"class_name" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"racer_id" text,
	"driver_name_raw" text,
	"kart_number" text,
	"position" integer,
	"laps" integer,
	"best_lap_ms" integer,
	"total_time_ms" integer,
	"gap_ms" integer,
	"status" "result_status" DEFAULT 'finished' NOT NULL,
	"points" integer,
	"provenance" "provenance" DEFAULT 'self_reported' NOT NULL,
	"ingest_path" "ingest_path" DEFAULT 'manual' NOT NULL,
	"source_ref" jsonb,
	"extraction_confidence" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text,
	"name" text NOT NULL,
	"season_year" integer NOT NULL,
	"classes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"points_system" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"drop_scores" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series_rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"series_id" text NOT NULL,
	"event_id" text NOT NULL,
	"round_number" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series_sponsorships" (
	"id" text PRIMARY KEY NOT NULL,
	"series_id" text NOT NULL,
	"class_name" text,
	"sponsor_org_name" text NOT NULL,
	"rate_usd" integer NOT NULL,
	"split_platform_pct" integer NOT NULL,
	"split_track_pct" integer NOT NULL,
	"split_racers_pct" integer NOT NULL,
	"status" text DEFAULT 'sold' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"racer_id" text NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "claim_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" text PRIMARY KEY NOT NULL,
	"racer_id" text NOT NULL,
	"claimed_by_user_id" text NOT NULL,
	"verified_via" text NOT NULL,
	"is_guardian_claim" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "takedown_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"racer_id" text,
	"requested_by_email" text NOT NULL,
	"reason" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rating_history" (
	"id" text PRIMARY KEY NOT NULL,
	"rating_id" text NOT NULL,
	"result_id" text,
	"mu_before" double precision NOT NULL,
	"mu_after" double precision NOT NULL,
	"sigma_before" double precision NOT NULL,
	"sigma_after" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" text PRIMARY KEY NOT NULL,
	"racer_id" text NOT NULL,
	"class_name" text NOT NULL,
	"mu" double precision DEFAULT 1400 NOT NULL,
	"sigma" double precision DEFAULT 300 NOT NULL,
	"ranked_result_count" integer DEFAULT 0 NOT NULL,
	"is_provisional" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_racer_id_class_name_unique" UNIQUE("racer_id","class_name")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_racers" ADD CONSTRAINT "guardian_racers_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_racers" ADD CONSTRAINT "guardian_racers_racer_id_racers_id_fk" FOREIGN KEY ("racer_id") REFERENCES "public"."racers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_staff" ADD CONSTRAINT "track_staff_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_staff" ADD CONSTRAINT "track_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_claimed_by_user_id_users_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "racers" ADD CONSTRAINT "racers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "racers" ADD CONSTRAINT "racers_home_track_id_tracks_id_fk" FOREIGN KEY ("home_track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transponder_assignments" ADD CONSTRAINT "transponder_assignments_transponder_id_transponders_id_fk" FOREIGN KEY ("transponder_id") REFERENCES "public"."transponders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transponder_assignments" ADD CONSTRAINT "transponder_assignments_racer_id_racers_id_fk" FOREIGN KEY ("racer_id") REFERENCES "public"."racers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laps" ADD CONSTRAINT "laps_result_id_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "race_sessions" ADD CONSTRAINT "race_sessions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_session_id_race_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."race_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_racer_id_racers_id_fk" FOREIGN KEY ("racer_id") REFERENCES "public"."racers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_rounds" ADD CONSTRAINT "series_rounds_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_rounds" ADD CONSTRAINT "series_rounds_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_sponsorships" ADD CONSTRAINT "series_sponsorships_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_invitations" ADD CONSTRAINT "claim_invitations_racer_id_racers_id_fk" FOREIGN KEY ("racer_id") REFERENCES "public"."racers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_racer_id_racers_id_fk" FOREIGN KEY ("racer_id") REFERENCES "public"."racers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_claimed_by_user_id_users_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "takedown_requests" ADD CONSTRAINT "takedown_requests_racer_id_racers_id_fk" FOREIGN KEY ("racer_id") REFERENCES "public"."racers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_history" ADD CONSTRAINT "rating_history_rating_id_ratings_id_fk" FOREIGN KEY ("rating_id") REFERENCES "public"."ratings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_history" ADD CONSTRAINT "rating_history_result_id_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."results"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_racer_id_racers_id_fk" FOREIGN KEY ("racer_id") REFERENCES "public"."racers"("id") ON DELETE cascade ON UPDATE no action;