-- org_members upserts in /api/auth/sync use onConflict (org_id, user_id), but
-- the table only had a PK on id. Add the matching unique constraint so the
-- upsert resolves instead of failing with "no unique/exclusion constraint
-- matching the ON CONFLICT specification" (the POST /api/auth/sync 500).
delete from "public"."org_members" a
  using "public"
."org_members" b
  where a.ctid < b.ctid and a.org_id = b.org_id and a.user_id = b.user_id;

alter table "public"."org_members"
  add constraint "org_members_org_id_user_id_key" unique (org_id, user_id);
