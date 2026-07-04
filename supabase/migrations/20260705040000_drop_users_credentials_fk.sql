-- Revert 20260705030000: remove the users -> user_credentials foreign key.
--
-- That FK required a user_credentials row to exist before a public.users row
-- could be inserted. It is incompatible with the intended enrollment order,
-- where the users row is created FIRST (at invite time) and user_credentials is
-- only created later when the invitee accepts and sets a password.
--
-- There is intentionally NO foreign key between users and user_credentials in
-- either direction: the auth0_user_id link is reconciled by the enrollment /
-- sync layer (POST /api/auth/sync), because the final auth0_user_id is not known
-- until the credential is created at signup.

alter table "public"."users"
  drop constraint if exists "users_auth0_user_id_fkey";
