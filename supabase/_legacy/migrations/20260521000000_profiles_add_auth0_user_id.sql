-- Add auth0_user_id to profiles so we can map an Auth0 JWT sub claim
-- (e.g. "auth0|64abc...") to the internal profile UUID used by user_roles,
-- attendance_records, and RLS policies.
--
-- This is needed when bypassing Supabase Auth and validating Auth0 tokens
-- directly in the backend server.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth0_user_id text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_auth0_user_id
  ON public.profiles (auth0_user_id);
