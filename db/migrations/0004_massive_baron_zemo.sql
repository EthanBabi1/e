CREATE TABLE "bids" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"sponsor_user_id" text NOT NULL,
	"amount_usd" integer NOT NULL,
	"stripe_setup_intent_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsorship_agreements" (
	"id" text PRIMARY KEY NOT NULL,
	"sponsorship_id" text NOT NULL,
	"term_start" text NOT NULL,
	"term_end" text NOT NULL,
	"events_covered" integer,
	"logo_spec_url" text,
	"logo_delivery_deadline" text,
	"withdrawal_policy_snapshot" text NOT NULL,
	"policy_version_id" text NOT NULL,
	"pdf_url" text,
	"accepted_by_racer_or_guardian_at" timestamp with time zone,
	"accepted_by_sponsor_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsorships" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"racer_id" text NOT NULL,
	"sponsor_user_id" text NOT NULL,
	"amount_usd" integer NOT NULL,
	"platform_fee_usd" integer NOT NULL,
	"track_rev_share_usd" integer DEFAULT 0 NOT NULL,
	"racer_net_usd" integer NOT NULL,
	"status" "sponsorship_status" DEFAULT 'pending_guardian_approval' NOT NULL,
	"guardian_approved_winner_at" timestamp with time zone,
	"stripe_charge_id" text,
	"stripe_transfer_id" text,
	"decal_photo_url" text,
	"decal_uploaded_at" timestamp with time zone,
	"sponsor_confirmed_at" timestamp with time zone,
	"auto_release_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"refund_amount_usd" integer,
	"sponsor_credit_usd" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supporter_pledges" (
	"id" text PRIMARY KEY NOT NULL,
	"racer_id" text NOT NULL,
	"sponsor_user_id" text NOT NULL,
	"amount_usd" integer NOT NULL,
	"stripe_charge_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connect_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_type" text NOT NULL,
	"owner_id" text NOT NULL,
	"stripe_account_id" text NOT NULL,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"connect_account_id" text NOT NULL,
	"amount_usd" integer NOT NULL,
	"kind" text NOT NULL,
	"sponsorship_id" text,
	"stripe_transfer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tier" "subscription_tier" DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"current_period_end" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_listing_id_zone_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."zone_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_sponsor_user_id_users_id_fk" FOREIGN KEY ("sponsor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship_agreements" ADD CONSTRAINT "sponsorship_agreements_sponsorship_id_sponsorships_id_fk" FOREIGN KEY ("sponsorship_id") REFERENCES "public"."sponsorships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_listing_id_zone_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."zone_listings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_racer_id_racers_id_fk" FOREIGN KEY ("racer_id") REFERENCES "public"."racers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_sponsor_user_id_users_id_fk" FOREIGN KEY ("sponsor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supporter_pledges" ADD CONSTRAINT "supporter_pledges_racer_id_racers_id_fk" FOREIGN KEY ("racer_id") REFERENCES "public"."racers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supporter_pledges" ADD CONSTRAINT "supporter_pledges_sponsor_user_id_users_id_fk" FOREIGN KEY ("sponsor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_connect_account_id_connect_accounts_id_fk" FOREIGN KEY ("connect_account_id") REFERENCES "public"."connect_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;