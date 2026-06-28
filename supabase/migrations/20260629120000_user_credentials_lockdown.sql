-- Restore deny-all on the credential store.
--
-- 20260625120000_user_credentials.sql intentionally enabled RLS with NO
-- policies so public.user_credentials (email + bcrypt hash) is unreachable from
-- the browser/PostgREST anon & authenticated roles. The Auth0 custom-db scripts
-- and the service role connect as table owner / service_role and bypass RLS.
--
-- 20260625172813_remote_schema.sql later added "own row" policies for the
-- authenticated role, which exposed password_hash to the browser and allowed a
-- logged-in user to read/insert/update/delete their credential row. Drop them.
drop policy
if exists "user_credentials: select own" on "public"."user_credentials";
drop policy
if exists "user_credentials: insert own" on "public"."user_credentials";
drop policy
if exists "user_credentials: update own" on "public"."user_credentials";
drop policy
if exists "user_credentials: delete own" on "public"."user_credentials";

-- RLS stays ENABLED with zero policies => deny-all for anon/authenticated.
alter table "public"."user_credentials" enable row level security;
