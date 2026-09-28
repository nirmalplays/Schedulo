-- Final guard against double-booking: no two active bookings for the same host
-- may overlap in time. Stronger than a unique index on (host_id, start_utc),
-- which would miss overlaps with different start times.
-- btree_gist lives in its own schema (Supabase recommends keeping extensions out of public).
CREATE SCHEMA IF NOT EXISTS extensions;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist ("host_id" WITH =, tstzrange("start_utc", "end_utc", '[)') WITH &&)
  WHERE ("status" IN ('confirmed', 'held'));
