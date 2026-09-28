CREATE TABLE "calendar_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"email" text,
	"access_token_enc" text,
	"refresh_token_enc" text,
	"access_token_expires_at" timestamp with time zone,
	"scope" text,
	"check_calendar_ids" jsonb DEFAULT '["primary"]'::jsonb NOT NULL,
	"write_calendar_id" text DEFAULT 'primary' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_connections_user_id_provider_provider_account_id_unique" UNIQUE("user_id","provider","provider_account_id")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "external_calendar_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "calendar_connection_id" text;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_calendar_connection_id_calendar_connections_id_fk" FOREIGN KEY ("calendar_connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE set null ON UPDATE no action;