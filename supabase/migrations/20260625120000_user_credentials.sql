-- Custom-database credential store for the Auth0 custom-database connection.
--
-- Auth0 authenticates against THIS table via auth0/database-scripts/*.js
-- (login / get-user / create / verify / change-password / delete).
--
-- It is deliberately kept SEPARATE from public.users (application state):
--   * public.user_credentials  -> identity/credentials ONLY (email + bcrypt hash).
--   * public.users             -> profile + tenancy, populated/linked by
--                                 POST /api/auth/sync on first login, keyed by
--                                 the Auth0 subject "auth0|<id>" where <id> is the
--                                 user_credentials.id returned by Login/Get User.
--
-- This separation avoids coupling sign-up to the users.auth0_org_id NOT NULL FK
-- to organizations, so a user can register before any org/tenant exists.

CREATE TABLE
IF NOT EXISTS "public"."user_credentials"
(
    "id" "uuid" DEFAULT "gen_random_uuid"
() NOT NULL,
    "email" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "email_verified" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp
with time zone DEFAULT "now"
() NOT NULL,
    "updated_at" timestamp
with time zone DEFAULT "now"
() NOT NULL,
    CONSTRAINT "user_credentials_pkey" PRIMARY KEY
("id"),
    CONSTRAINT "user_credentials_status_check"
        CHECK
(("status" = ANY
(ARRAY['active'::"text", 'blocked'::"text", 'deleted'::"text"])))
);

ALTER TABLE "public"."user_credentials" OWNER TO "postgres";

-- Case-insensitive uniqueness on email (the login / lookup key).
CREATE UNIQUE INDEX
IF NOT EXISTS "user_credentials_email_lower_key"
    ON "public"."user_credentials" USING "btree"
("lower"
("email"));

-- The Auth0 scripts connect through the Supabase pooler as the table owner
-- (postgres), which bypasses RLS. Enabling RLS with NO policies denies all
-- access through the anon / authenticated PostgREST roles, so the credential
-- store is never reachable from the browser or the Supabase REST API.
ALTER TABLE "public"."user_credentials" ENABLE ROW LEVEL SECURITY;
