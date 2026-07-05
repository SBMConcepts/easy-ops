-- RECURRING FIX: drop the inverted user_credentials foreign keys (again).
--
-- These FKs are re-introduced by the pulled remote-schema snapshots
-- (20260704211053 line 541, 20260704221643) whenever the remote is re-synced,
-- and they break invitation signup:
--   insert or update on table "user_credentials" violates foreign key
--   constraint "user_credentials_auth0_user_id_fkey"
--
-- WHY they are wrong: Auth0's custom-DB create.js inserts the user_credentials
-- row (auth0_user_id = 'auth0|<uuid>') at signup, BEFORE any public.users row
-- exists for that id (the real users row is written later by POST /api/auth/sync).
-- So a user_credentials -> users FK can never be satisfied at signup time.
--
-- There must be NO FK between user_credentials and users in either direction;
-- the auth0_user_id link is reconciled by the enrollment/sync layer.
--
-- If a future `supabase db pull` re-adds these constraints, add another dated
-- migration that drops them again (or drop them directly on the live DB).

alter table "public"."user_credentials"
  drop constraint if exists "user_credentials_auth0_user_id_fkey";

alter table "public"."user_credentials"
  drop constraint if exists "user_credentials_auth0_org_id_fkey";
