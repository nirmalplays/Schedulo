-- Supabase exposes the public schema through its Data API (PostgREST). The app
-- talks to Postgres directly as a role that bypasses RLS, so enabling RLS with
-- no policies denies API access (anon / authenticated) without affecting the app.
-- Every new table must be added here too; a test asserts it (bookings.test.ts).
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calendar_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "date_overrides" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "event_types" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "booking_questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
