-- Fix inverted foreign keys on user_credentials.
--
-- Root cause: the pulled remote schema added
--   user_credentials.auth0_user_id -> users.auth0_user_id   (20260704211053)
--   user_credentials.auth0_org_id  -> users.auth0_org_id    (20260704221643, NOT VALID)
-- but in this app user_credentials is the authentication root: Auth0's custom-DB
-- create script (auth0/database-scripts/create.js) inserts the credentials row
-- FIRST at signup, and the matching public.users profile row is only created
-- afterwards by POST /api/auth/sync (post-login / post-registration action).
--
-- With these FKs in place, accepting an invitation and signing up fails with:
--   insert or update on table "user_credentials" violates foreign key
--   constraint "user_credentials_auth0_user_id_fkey"
-- because no users row exists yet for the new auth0_user_id.
--
-- The correct dependency direction is the reverse (users depends on credentials),
-- which is already how org_members.auth0_user_id references
-- user_credentials.auth0_user_id. These two constraints are simply dropped;
-- credential<->profile consistency is maintained by /api/auth/sync.

alter table "public"."user_credentials"
  drop constraint if exists "user_credentials_auth0_user_id_fkey";

alter table "public"."user_credentials"
  drop constraint if exists "user_credentials_auth0_org_id_fkey";
