-- Fix: signup (auth0/database-scripts/create.js) could never insert a credential
-- row because 20260625172813_remote_schema.sql added a NOT NULL auth0_user_id
-- column with an ENFORCED foreign key to public.users(auth0_user_id).
--
-- The credential row is created during sign-up (create.js), which runs BEFORE
-- the application user row exists — public.users is created later by
-- POST /api/auth/sync on first login. So the FK always failed with a 23503
-- "Key (auth0_user_id)=() is not present in table users" violation, leaving
-- public.user_credentials empty.
--
-- This restores the decoupling the original 20260625120000 migration documented,
-- while KEEPING the auth0_user_id column so it can carry the user's Auth0 subject
-- (now populated by create.js as 'auth0|' || id). The subject suffix is the
-- credential id, so Login / Get User / Create all agree on the identity.

-- 1. Drop the enforced FK to public.users (unsatisfiable at sign-up time).
ALTER TABLE "public"."user_credentials"
  DROP CONSTRAINT IF EXISTS "user_credentials_auth0_user_id_fkey";

-- 2. Allow auth0_user_id to be set AFTER the row's id is generated (create.js
--    sets it in the same statement via a CTE), so the insert is no longer
--    blocked by NOT NULL + an empty default.
ALTER TABLE "public"."user_credentials"
  ALTER COLUMN "auth0_user_id" DROP DEFAULT;

ALTER TABLE "public"."user_credentials"
  ALTER COLUMN "auth0_user_id" DROP NOT NULL;
