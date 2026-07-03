-- Re-drop the unsatisfiable FK on public.user_credentials.
--
-- 20260628190000_user_credentials_signup_fix.sql already dropped
-- user_credentials_auth0_user_id_fkey (FK -> public.users(auth0_user_id)), but a
-- later `supabase db pull` / remote re-provision re-added it on the current
-- Supabase project. The FK is unsatisfiable at sign-up time: create.js inserts
-- the credential row (auth0_user_id = 'auth0|' || id) BEFORE the matching
-- public.users row exists (users are created later by POST /api/auth/sync on
-- first login), so invitation signup fails with 23503:
--   insert or update on table "user_credentials" violates foreign key
--   constraint "user_credentials_auth0_user_id_fkey".
--
-- Drop the FK again while KEEPING the auth0_user_id column (and its UNIQUE
-- constraint) so it can still carry the user's Auth0 subject.
ALTER TABLE "public"."user_credentials"
  DROP CONSTRAINT IF EXISTS "user_credentials_auth0_user_id_fkey";

-- Keep auth0_user_id decoupled from public.users: nullable, no default.
ALTER TABLE "public"."user_credentials"
  ALTER COLUMN "auth0_user_id" DROP DEFAULT;

ALTER TABLE "public"."user_credentials"
  ALTER COLUMN "auth0_user_id" DROP NOT NULL;
