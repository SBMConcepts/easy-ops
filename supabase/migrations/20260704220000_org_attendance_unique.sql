-- Add a unique constraint to org_attendance so the daily aggregate can be
-- upserted with ON CONFLICT (user_id, org_id, date). Without this, the
-- CheckIn upsert fails: "there is no unique or exclusion constraint matching
-- the ON CONFLICT specification".
alter table "public"."org_attendance"
  add constraint "org_attendance_user_id_org_id_date_key"
  unique ("user_id", "org_id", "date");
