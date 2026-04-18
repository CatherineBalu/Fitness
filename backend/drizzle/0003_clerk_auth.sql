-- Migration: Replace custom auth with Clerk
-- Adds clerk_id, removes password, makes phone_number nullable

ALTER TABLE "TB_person" ADD COLUMN "clerk_id" text;
ALTER TABLE "TB_person" ALTER COLUMN "phone_number" DROP NOT NULL;
ALTER TABLE "TB_person" DROP COLUMN IF EXISTS "password";

-- Truncate dependent tables before adding NOT NULL constraint (dev/seed data only)
TRUNCATE TABLE "TB_payment_history", "TB_customer_reservation", "TB_schedule_instructor",
               "TB_schedule", "TB_customer", "TB_employee", "TB_person" CASCADE;

ALTER TABLE "TB_person" ALTER COLUMN "clerk_id" SET NOT NULL;
ALTER TABLE "TB_person" ADD CONSTRAINT "TB_person_clerk_id_unique" UNIQUE("clerk_id");
