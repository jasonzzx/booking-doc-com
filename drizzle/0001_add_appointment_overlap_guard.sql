-- Belt-and-suspenders guard against double-booking a doctor, enforced by
-- Postgres itself so it holds even under concurrent requests (the app also
-- checks for conflicts before inserting, but only this constraint is
-- actually race-proof).
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "appointments"
	ADD COLUMN "during" tstzrange GENERATED ALWAYS AS (tstzrange("start_at", "end_at", '[)')) STORED;
--> statement-breakpoint
ALTER TABLE "appointments"
	ADD CONSTRAINT "appointments_no_overlap" EXCLUDE USING gist (
		"doctor_id" WITH =,
		"during" WITH &&
	) WHERE ("status" = 'booked');
