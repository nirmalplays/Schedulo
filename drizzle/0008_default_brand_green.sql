ALTER TABLE "users" ALTER COLUMN "brand_color" SET DEFAULT '#2f6b55';--> statement-breakpoint
-- Hosts still on an earlier default colour move to the new default.
UPDATE "users" SET "brand_color" = '#2f6b55' WHERE "brand_color" IN ('#2563eb', '#006bff');
