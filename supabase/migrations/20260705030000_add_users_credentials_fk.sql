-- Add the correctly-directed foreign key between profiles and credentials.
--
-- user_credentials is the identity root (created first at signup by Auth0's
-- custom-DB create.js); public.users is the derived profile synced afterwards by
-- POST /api/auth/sync. So the dependency must point profile -> credential, which
-- is the reverse of the inverted constraint dropped in 20260705020000.
--
-- References user_credentials.auth0_user_id (unique: user_credentials_auth0_user_id_key).
-- Added NOT VALID so it enforces on all new inserts/updates without failing the
-- migration on any pre-existing rows. Run VALIDATE CONSTRAINT once data is known
-- clean if you want existing rows checked too:
--   ALTER TABLE public.users VALIDATE CONSTRAINT users_auth0_user_id_fkey;

alter table "public"."users"
  drop constraint if exists "users_auth0_user_id_fkey";

alter table "public"."users"
  add constraint "users_auth0_user_id_fkey"
  foreign key ("auth0_user_id")
  references "public"."user_credentials" ("auth0_user_id")
  on update cascade on delete cascade
not valid;
