


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."attendance_status" AS ENUM (
    'present',
    'late',
    'absent',
    'leave',
    'holiday'
);


ALTER TYPE "public"."attendance_status" OWNER TO "postgres";


CREATE TYPE "public"."check_in_method" AS ENUM (
    'qr',
    'biometric',
    'whatsapp',
    'manual',
    'georefrence'
);


ALTER TYPE "public"."check_in_method" OWNER TO "postgres";


CREATE TYPE "public"."organization_role" AS ENUM (
    'admin',
    'manager',
    'supervisor',
    'employee',
    'owner'
);


ALTER TYPE "public"."organization_role" OWNER TO "postgres";


CREATE TYPE "public"."organization_status" AS ENUM (
    'provisioning',
    'active',
    'suspended',
    'offboarding',
    'archived'
);


ALTER TYPE "public"."organization_status" OWNER TO "postgres";


CREATE TYPE "public"."subscription_plan" AS ENUM (
    'free',
    'growth',
    'pro',
    'enterprise'
);


ALTER TYPE "public"."subscription_plan" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'free',
    'active',
    'past_due',
    'canceled'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."org_id"() RETURNS "text"
    LANGUAGE "sql"
    SET "search_path" TO ''
    AS $$
  select nullif(
    coalesce(
      auth.jwt() -> 'org_id',
      auth.jwt() -> 'https://easyops.us.auth0.com/org_id'
    )::text,
    'null'
  );
$$;


ALTER FUNCTION "public"."org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "text" NOT NULL,
    "actor_user_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "text",
    "diff" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(32), 'hex'::"text") NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "accepted_at" timestamp with time zone
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "text" DEFAULT ''::"text" NOT NULL,
    "user_id" "text" DEFAULT ''::"text" NOT NULL,
    "date" "date" NOT NULL,
    "method" "public"."check_in_method" NOT NULL,
    "hours_worked" numeric NOT NULL,
    "overtime" numeric NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."org_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth0_org_id" "text" DEFAULT ''::"text" NOT NULL,
    "department_name" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "updated_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL
);


ALTER TABLE "public"."org_departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth0_org_id" "text" DEFAULT ''::"text" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auth0_user_id" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "org_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text", 'viewer'::"text"]))),
    CONSTRAINT "org_members_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."org_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth0_org_id" "text" DEFAULT ''::"text" NOT NULL,
    "name" "public"."organization_role" NOT NULL
);


ALTER TABLE "public"."org_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_sites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_name" "text" DEFAULT ''::"text" NOT NULL,
    "auth0_org_id" "text" DEFAULT ''::"text" NOT NULL,
    "department_id" "uuid" NOT NULL,
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "geo_radius" bigint NOT NULL,
    "address" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."org_sites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "auth0_org_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "updated_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "industry" "text" DEFAULT ''::"text" NOT NULL,
    "country" "text" DEFAULT ''::"text" NOT NULL,
    "logo_url" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "organizations_plan_check" CHECK (("plan" = ANY (ARRAY['free'::"text", 'starter'::"text", 'pro'::"text", 'enterprise'::"text"]))),
    CONSTRAINT "organizations_status_check" CHECK (("status" = ANY (ARRAY['provisioning'::"text", 'active'::"text", 'suspended'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organizations"."name" IS 'Display Name';



COMMENT ON COLUMN "public"."organizations"."slug" IS 'name (slug)';



CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "text" NOT NULL,
    "plan" "text" NOT NULL,
    "status" "text" DEFAULT 'trialing'::"text" NOT NULL,
    "trial_ends_at" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['trialing'::"text", 'active'::"text", 'past_due'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "password_hash" "text",
    "email_verified" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auth0_user_id" "text" DEFAULT ''::"text" NOT NULL,
    "auth0_org_id" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "user_credentials_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'blocked'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."user_credentials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth0_user_id" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "avatar_url" "text",
    "last_seen_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "auth0_org_id" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_org_id_email_key" UNIQUE ("org_id", "email");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."org_attendance"
    ADD CONSTRAINT "org_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_departments"
    ADD CONSTRAINT "org_departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_org_id_user_id_key" UNIQUE ("auth0_org_id", "auth0_user_id");



ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_user_id_key" UNIQUE ("auth0_user_id");



ALTER TABLE ONLY "public"."org_roles"
    ADD CONSTRAINT "org_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_sites"
    ADD CONSTRAINT "org_sites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("auth0_org_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_credentials"
    ADD CONSTRAINT "user_credentials_auth0_org_id_key" UNIQUE ("auth0_org_id");



ALTER TABLE ONLY "public"."user_credentials"
    ADD CONSTRAINT "user_credentials_auth0_org_id_key1" UNIQUE ("auth0_org_id");



ALTER TABLE ONLY "public"."user_credentials"
    ADD CONSTRAINT "user_credentials_auth0_org_id_key2" UNIQUE ("auth0_org_id");



ALTER TABLE ONLY "public"."user_credentials"
    ADD CONSTRAINT "user_credentials_auth0_org_id_key3" UNIQUE ("auth0_org_id");



ALTER TABLE ONLY "public"."user_credentials"
    ADD CONSTRAINT "user_credentials_auth0_user_id_key" UNIQUE ("auth0_user_id");



ALTER TABLE ONLY "public"."user_credentials"
    ADD CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth0_org_id_key" UNIQUE ("auth0_org_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth0_user_id_key" UNIQUE ("auth0_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "audit_logs_org_id_created_at_idx" ON "public"."audit_logs" USING "btree" ("org_id", "created_at" DESC);



CREATE INDEX "invitations_token_idx" ON "public"."invitations" USING "btree" ("token");



CREATE INDEX "org_members_org_id_active_idx" ON "public"."org_members" USING "btree" ("auth0_org_id") WHERE ("status" = 'active'::"text");



CREATE INDEX "org_members_org_id_idx" ON "public"."org_members" USING "btree" ("auth0_org_id");



CREATE INDEX "subscriptions_org_id_idx" ON "public"."subscriptions" USING "btree" ("org_id");



CREATE UNIQUE INDEX "user_credentials_email_lower_key" ON "public"."user_credentials" USING "btree" ("lower"("email"));



CREATE INDEX "users_auth0_user_id_idx" ON "public"."users" USING "btree" ("auth0_user_id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("auth0_org_id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("auth0_org_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_attendance"
    ADD CONSTRAINT "org_attendance_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("auth0_org_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_attendance"
    ADD CONSTRAINT "org_attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("auth0_user_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_departments"
    ADD CONSTRAINT "org_departments_auth0_org_id_fkey" FOREIGN KEY ("auth0_org_id") REFERENCES "public"."organizations"("auth0_org_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_auth0_org_id_fkey" FOREIGN KEY ("auth0_org_id") REFERENCES "public"."organizations"("auth0_org_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_auth0_user_id_fkey" FOREIGN KEY ("auth0_user_id") REFERENCES "public"."user_credentials"("auth0_user_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_roles"
    ADD CONSTRAINT "org_roles_auth0_org_id_fkey" FOREIGN KEY ("auth0_org_id") REFERENCES "public"."organizations"("auth0_org_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_sites"
    ADD CONSTRAINT "org_sites_auth0_org_id_fkey" FOREIGN KEY ("auth0_org_id") REFERENCES "public"."organizations"("auth0_org_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_sites"
    ADD CONSTRAINT "org_sites_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."org_departments"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("auth0_org_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_credentials"
    ADD CONSTRAINT "user_credentials_auth0_user_id_fkey" FOREIGN KEY ("auth0_user_id") REFERENCES "public"."users"("auth0_user_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth0_org_id_fkey" FOREIGN KEY ("auth0_org_id") REFERENCES "public"."organizations"("auth0_org_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs: members read" ON "public"."audit_logs" FOR SELECT USING (("org_id" = "public"."org_id"()));



ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invitations: admins manage" ON "public"."invitations" USING (("org_id" = "public"."org_id"()));



CREATE POLICY "org: members read own org" ON "public"."organizations" FOR SELECT USING (("auth0_org_id" = "public"."org_id"()));



ALTER TABLE "public"."org_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_members: members read own org" ON "public"."org_members" FOR SELECT USING (("auth0_org_id" = ( SELECT "u"."auth0_org_id"
   FROM "public"."users" "u"
  WHERE ("u"."auth0_user_id" = ("auth"."jwt"() ->> 'sub'::"text"))
 LIMIT 1)));



ALTER TABLE "public"."org_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_sites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_sites: admin/manager/owner delete" ON "public"."org_sites" FOR DELETE USING ((("auth0_org_id" = "public"."org_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."org_members" "om"
  WHERE (("om"."auth0_org_id" = "org_sites"."auth0_org_id") AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'owner'::"text"])) AND ("om"."auth0_user_id" = ("auth"."jwt"() ->> 'sub'::"text")))))));



CREATE POLICY "org_sites: admin/manager/owner insert" ON "public"."org_sites" FOR INSERT WITH CHECK ((("auth0_org_id" = "public"."org_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."org_members" "om"
  WHERE (("om"."auth0_org_id" = "org_sites"."auth0_org_id") AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'owner'::"text"])) AND ("om"."auth0_user_id" = ("auth"."jwt"() ->> 'sub'::"text")))))));



CREATE POLICY "org_sites: admin/manager/owner update" ON "public"."org_sites" FOR UPDATE USING ((("auth0_org_id" = "public"."org_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."org_members" "om"
  WHERE (("om"."auth0_org_id" = "org_sites"."auth0_org_id") AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'owner'::"text"])) AND ("om"."auth0_user_id" = ("auth"."jwt"() ->> 'sub'::"text"))))))) WITH CHECK ((("auth0_org_id" = "public"."org_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."org_members" "om"
  WHERE (("om"."auth0_org_id" = "org_sites"."auth0_org_id") AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'owner'::"text"])) AND ("om"."auth0_user_id" = ("auth"."jwt"() ->> 'sub'::"text")))))));



CREATE POLICY "org_sites: members read" ON "public"."org_sites" FOR SELECT USING ((("auth0_org_id" = "public"."org_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."org_members" "om"
  WHERE (("om"."auth0_org_id" = "org_sites"."auth0_org_id") AND ("om"."status" = 'active'::"text") AND ("om"."role" = ANY (ARRAY['employee'::"text", 'admin'::"text", 'manager'::"text", 'supervisor'::"text", 'owner'::"text"])) AND ("om"."auth0_user_id" = ("auth"."jwt"() ->> 'sub'::"text")))))));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscriptions: members read" ON "public"."subscriptions" FOR SELECT USING (("org_id" = "public"."org_id"()));



ALTER TABLE "public"."user_credentials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_credentials: delete own" ON "public"."user_credentials" FOR DELETE USING (("auth0_user_id" = ("auth"."jwt"() ->> 'sub'::"text")));



CREATE POLICY "user_credentials: insert own" ON "public"."user_credentials" FOR INSERT WITH CHECK (("auth0_user_id" = ("auth"."jwt"() ->> 'sub'::"text")));



CREATE POLICY "user_credentials: select own" ON "public"."user_credentials" FOR SELECT USING (("auth0_user_id" = ("auth"."jwt"() ->> 'sub'::"text")));



CREATE POLICY "user_credentials: update own" ON "public"."user_credentials" FOR UPDATE USING (("auth0_user_id" = ("auth"."jwt"() ->> 'sub'::"text"))) WITH CHECK (("auth0_user_id" = ("auth"."jwt"() ->> 'sub'::"text")));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users: read own" ON "public"."users" FOR SELECT USING (("auth0_user_id" = ("auth"."jwt"() ->> 'sub'::"text")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;


















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."org_attendance" TO "anon";
GRANT ALL ON TABLE "public"."org_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."org_attendance" TO "service_role";



GRANT ALL ON TABLE "public"."org_departments" TO "anon";
GRANT ALL ON TABLE "public"."org_departments" TO "authenticated";
GRANT ALL ON TABLE "public"."org_departments" TO "service_role";



GRANT ALL ON TABLE "public"."org_members" TO "anon";
GRANT ALL ON TABLE "public"."org_members" TO "authenticated";
GRANT ALL ON TABLE "public"."org_members" TO "service_role";



GRANT ALL ON TABLE "public"."org_roles" TO "anon";
GRANT ALL ON TABLE "public"."org_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."org_roles" TO "service_role";



GRANT ALL ON TABLE "public"."org_sites" TO "anon";
GRANT ALL ON TABLE "public"."org_sites" TO "authenticated";
GRANT ALL ON TABLE "public"."org_sites" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."user_credentials" TO "anon";
GRANT ALL ON TABLE "public"."user_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."user_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































drop extension if exists "pg_net";


