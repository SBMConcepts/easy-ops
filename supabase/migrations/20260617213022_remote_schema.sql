


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


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."access_request_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'expired'
);


ALTER TYPE "public"."access_request_status" OWNER TO "postgres";


CREATE TYPE "public"."app_permission" AS ENUM (
    'tenant:read',
    'tenant:write',
    'tenant:admin',
    'members:read',
    'members:invite',
    'members:manage',
    'attendance:read',
    'attendance:write',
    'attendance:verify',
    'departments:manage',
    'sites:manage',
    'shifts:manage',
    'roles:manage',
    'audit:read',
    'billing:manage',
    'read:own-profile',
    'update:own-profile',
    'read:sites',
    'read:departments',
    'read:shifts',
    'read:access-requests',
    'approve:access-requests',
    'read:compliance',
    'read:reports',
    'export:reports',
    'read:tenant-analytics',
    'read:billing',
    'export:audit',
    'manage:security',
    'manage:integrations',
    'read:payroll',
    'manage:payroll',
    'read:benefits',
    'manage:benefits',
    'read:attendance',
    'write:attendance',
    'verify:attendance',
    'manage:members',
    'access-requests:approve',
    'read:tenant',
    'payroll:manage',
    'write:tenant',
    'benefits:manage',
    'manage:roles',
    'manage:sites',
    'own-profile:update',
    'read:audit',
    'manage:shifts',
    'access-requests:read',
    'manage:departments',
    'sites:read',
    'admin:tenant',
    'read:members',
    'invite:members',
    'shifts:read',
    'departments:read',
    'security:manage',
    'benefits:read',
    'tenant-analytics:read',
    'reports:read',
    'audit:export',
    'integrations:manage',
    'compliance:read',
    'own-profile:read',
    'manage:billing',
    'payroll:read',
    'reports:export',
    'billing:read'
);


ALTER TYPE "public"."app_permission" OWNER TO "postgres";


CREATE TYPE "public"."attendance_status" AS ENUM (
    'present',
    'late',
    'absent',
    'leave',
    'holiday'
);


ALTER TYPE "public"."attendance_status" OWNER TO "postgres";


CREATE TYPE "public"."billing_plan" AS ENUM (
    'starter',
    'growth',
    'pro',
    'enterprise'
);


ALTER TYPE "public"."billing_plan" OWNER TO "postgres";


CREATE TYPE "public"."billing_status" AS ENUM (
    'trialing',
    'active',
    'past_due',
    'canceled'
);


ALTER TYPE "public"."billing_status" OWNER TO "postgres";


CREATE TYPE "public"."check_in_method" AS ENUM (
    'qr',
    'biometric',
    'whatsapp',
    'manual',
    'geofence'
);


ALTER TYPE "public"."check_in_method" OWNER TO "postgres";


CREATE TYPE "public"."lead_status" AS ENUM (
    'new',
    'contacted',
    'qualified',
    'demo_scheduled',
    'proposal_sent',
    'won',
    'lost',
    'unresponsive'
);


ALTER TYPE "public"."lead_status" OWNER TO "postgres";


CREATE TYPE "public"."membership_status" AS ENUM (
    'invited',
    'active',
    'suspended',
    'offboarded'
);


ALTER TYPE "public"."membership_status" OWNER TO "postgres";


CREATE TYPE "public"."tenant_role" AS ENUM (
    'admin',
    'manager',
    'supervisor',
    'employee',
    'owner'
);


ALTER TYPE "public"."tenant_role" OWNER TO "postgres";


CREATE TYPE "public"."tenant_status" AS ENUM (
    'provisioning',
    'active',
    'suspended',
    'offboarding',
    'archived'
);


ALTER TYPE "public"."tenant_status" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'active',
    'suspended',
    'deleted'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_access_request_and_invite"("p_request_id" "uuid", "p_default_role" "public"."tenant_role" DEFAULT 'employee'::"public"."tenant_role") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_tenant_slug text;
  v_tenant_id uuid;
  v_decider_user_id text;     -- Auth0 sub (text)
  v_requester_user_id text;  -- app user id (text)
begin
  v_tenant_slug := (current_setting('request.headers', true)::jsonb ->> 'x-tenant-slug');

  if v_tenant_slug is null or v_tenant_slug = '' then
    raise exception 'Missing x-tenant-slug header';
  end if;

  select t.id
    into v_tenant_id
    from public.tenants t
   where t.slug = v_tenant_slug
   limit 1;

  if v_tenant_id is null then
    raise exception 'Tenant not found for slug: %', v_tenant_slug;
  end if;

  -- ✅ Use JWT sub (text) instead of auth.uid() (uuid)
  v_decider_user_id := public.current_user_id();
  if v_decider_user_id is null or v_decider_user_id = '' then
    raise exception 'Not authenticated';
  end if;

  -- Requester user id in your app user table (text)
  select u.id
    into v_requester_user_id
    from public.users u
   where lower(u.email) = (
     select lower(ar.requester_email)
     from public.access_requests ar
     where ar.id = p_request_id
   )
   limit 1;

  if v_requester_user_id is null then
    raise exception 'Requester user not found for request_id=%', p_request_id;
  end if;

  update public.access_requests
     set target_tenant_id = v_tenant_id,
         status = 'approved'::access_request_status,
         decided_by = v_decider_user_id,
         decided_at = now()
   where id = p_request_id
     and status = 'pending'
     and (target_tenant_id is null or target_tenant_id = v_tenant_id);

  if not found then
    raise exception 'Access request not found or not pending: %', p_request_id;
  end if;

  if not exists (
    select 1
      from public.memberships m
     where m.tenant_id = v_tenant_id
       and m.user_id = v_requester_user_id
  ) then
    insert into public.memberships (tenant_id, user_id, role, status, invited_by, joined_at)
    values (
      v_tenant_id,
      v_requester_user_id,
      p_default_role,
      default,
      v_decider_user_id,
      now()
    );
  end if;

end;
$$;


ALTER FUNCTION "public"."approve_access_request_and_invite"("p_request_id" "uuid", "p_default_role" "public"."tenant_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assert_tenant_match"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  ELSIF NEW.tenant_id <> public.current_tenant_id() THEN
    RAISE EXCEPTION 'tenant_id mismatch with JWT org_id' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."assert_tenant_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_log_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.audit_log (tenant_id, user_id, action, target_table, target_id, details)
  VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    (auth.jwt() ->> 'sub')::text,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id, NULL),
    to_jsonb(NEW)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_log_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_password"("p_email" "text", "p_password" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_ok boolean;
begin
  select pg_catalog.crypt(p_password, u.password_hash) = u.password_hash
  into v_ok
  from public.users u
  where u.email = p_email;

  return coalesce(v_ok, false);
end;
$$;


ALTER FUNCTION "public"."check_user_password"("p_email" "text", "p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT NULLIF(auth.jwt() ->> 'org_id','')::uuid
$$;


ALTER FUNCTION "public"."current_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_id"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT auth.jwt() ->> 'sub'
$$;


ALTER FUNCTION "public"."current_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_sub_text"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub','');
$$;


ALTER FUNCTION "public"."current_user_sub_text"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."defensive_set_tenant_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  IF NEW.tenant_id IS NULL THEN
    v_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
    IF v_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Missing tenant_id claim in JWT';
    END IF;
    NEW.tenant_id := v_tenant_id;
  END IF;

  -- Also prevent spoofing if client tries to provide a different tenant_id
  v_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
  IF v_tenant_id IS NOT NULL AND NEW.tenant_id <> v_tenant_id THEN
    RAISE EXCEPTION 'tenant_id mismatch';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."defensive_set_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_seat_cap"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _cap int;
  _used int;
BEGIN
  -- Seat cap enforced only for active memberships
  IF NEW.status <> 'active'::membership_status THEN
    RETURN NEW;
  END IF;

  SELECT s.seat_cap
    INTO _cap
  FROM public.subscriptions s
  WHERE s.tenant_id = NEW.tenant_id
    AND s.status = 'active'::billing_status
  ORDER BY s.current_period_end DESC NULLS LAST
  LIMIT 1;

  -- If there is no active subscription, do not block writes.
  -- (Change to RAISE EXCEPTION if you prefer strict behavior.)
  IF _cap IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
    INTO _used
  FROM public.memberships m
  WHERE m.tenant_id = NEW.tenant_id
    AND m.status = 'active'::membership_status;

  IF _used >= _cap THEN
    RAISE EXCEPTION 'Seat cap reached for tenant % (cap=%, used=%)', NEW.tenant_id, _cap, _used
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_seat_cap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_membership_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.auth0_sync_outbox (tenant_id, event_type, payload)
    VALUES (NEW.tenant_id, 'membership.created', jsonb_build_object(
      'membership_id', NEW.id, 'user_id', NEW.user_id, 'role', NEW.role, 'status', NEW.status));
  ELSIF TG_OP = 'UPDATE' AND (OLD.role IS DISTINCT FROM NEW.role OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.auth0_sync_outbox (tenant_id, event_type, payload)
    VALUES (NEW.tenant_id, 'membership.updated', jsonb_build_object(
      'membership_id', NEW.id, 'user_id', NEW.user_id,
      'role', NEW.role, 'previous_role', OLD.role,
      'status', NEW.status, 'previous_status', OLD.status));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.auth0_sync_outbox (tenant_id, event_type, payload)
    VALUES (OLD.tenant_id, 'membership.deleted', jsonb_build_object(
      'membership_id', OLD.id, 'user_id', OLD.user_id, 'role', OLD.role));
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;


ALTER FUNCTION "public"."enqueue_membership_sync"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_department_id"("_auth0_user_id" "text") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT ep.department_id
  FROM public.employee_profiles ep
  WHERE ep.auth0_user_id = _auth0_user_id
    AND ep.department_id IS NOT NULL
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_department_id"("_auth0_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_site_id"("_auth0_user_id" "text") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT ep.site_id
  FROM public.employee_profiles ep
  WHERE ep.auth0_user_id = _auth0_user_id
    AND ep.site_id IS NOT NULL
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_site_id"("_auth0_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, status)
  VALUES (
    public.current_user_id(),
    auth.jwt() ->> 'email',
    COALESCE(auth.jwt() ->> 'name', auth.jwt() ->> 'email'),
    auth.jwt() ->> 'picture',
    'active'
  )
  ON CONFLICT (email)
  DO UPDATE SET
    id = EXCLUDED.id,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_sync"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_sync_from_jwt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _auth0_id TEXT;
  _email TEXT;
  _name TEXT;
  _picture TEXT;
BEGIN
  -- Extract Auth0 token custom claims (using your exact namespace string)
  _auth0_id := (auth.jwt() ->> 'sub'); -- Standard openid subject identifier
  _email    := (auth.jwt() ->> 'email');
  _name     := COALESCE(auth.jwt() ->> 'name', _email);
  _picture  := (auth.jwt() ->> 'picture');

  -- If a valid authenticated user token is detected, update or insert their base profile
  IF _auth0_id IS NOT NULL AND _email IS NOT NULL THEN
    INSERT INTO public.users (id, email, full_name, avatar_url, status)
    VALUES (
      _auth0_id,
      LOWER(TRIM(_email)),
      _name,
      _picture,
      'active'
    )
    ON CONFLICT (email) 
    DO UPDATE SET 
      id = EXCLUDED.id, -- Upgrades 'pending|email' placeholders to real Auth0 IDs seamlessly
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_sync_from_jwt"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("_perm" "public"."app_permission") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.role_permissions rp
     WHERE rp.permission = _perm
       AND rp.role = NULLIF(
             current_setting('request.jwt.claims', true)::jsonb
               ->> 'https://easy-ops-za.vercel.app/role',
             ''
           )::public.tenant_role
  );
$$;


ALTER FUNCTION "public"."has_permission"("_perm" "public"."app_permission") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role_text"("_auth0_user_id" "text", "_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.user_id = _auth0_user_id
      AND m.role = _role::public.tenant_role
  );
$$;


ALTER FUNCTION "public"."has_role_text"("_auth0_user_id" "text", "_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_tenant_role"("_role" "public"."tenant_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.tenant_id = public.current_tenant_id()
      AND m.user_id   = public.current_user_id()
      AND m.role      = _role
      AND m.status    = 'active'
  )
$$;


ALTER FUNCTION "public"."has_tenant_role"("_role" "public"."tenant_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_attendance_hours"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.clock_in IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
    IF NEW.clock_out <= NEW.clock_in THEN
      RAISE EXCEPTION
        'attendance_records: clock_out (%) must be after clock_in (%)',
        NEW.clock_out, NEW.clock_in;
    END IF;

    NEW.hours_worked := ROUND(
      EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600.0,
      2
    );

    -- Overtime threshold: 8 hours standard shift.
    -- TODO: drive this from a tenant-level config column when that feature ships.
    NEW.overtime := GREATEST(0, NEW.hours_worked - 8);
  ELSE
    -- Partial record (clocked in but not yet out, or manual absence entry)
    NEW.hours_worked := NULL;
    NEW.overtime     := NULL;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."recompute_attendance_hours"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."set_attendance_auth0_employee_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.auth0_employee_id IS NULL OR NEW.auth0_employee_id = '' THEN
    NEW.auth0_employee_id := public.current_user_sub_text();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_attendance_auth0_employee_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_audit_log_auth0_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.auth0_user_id IS NULL OR NEW.auth0_user_id = '' THEN
    NEW.auth0_user_id := public.current_user_sub_text();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_audit_log_auth0_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_employee_profiles_auth0_user_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.auth0_user_id IS NULL OR NEW.auth0_user_id = '' THEN
    NEW.auth0_user_id := public.current_user_sub_text();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_employee_profiles_auth0_user_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_employee_profile_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT m.tenant_id
    INTO v_tenant_id
    FROM public.memberships m
   WHERE m.id = NEW.membership_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION
      'employee_profiles: membership_id % does not exist in memberships',
      NEW.membership_id;
  END IF;

  -- Always overwrite with the authoritative value — caller cannot override
  NEW.tenant_id := v_tenant_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_employee_profile_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_employee_profile_tenant_on_login"("p_user_id" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_updated_count bigint := 0;
begin
  -- Update all employee_profiles rows for this auth user (via memberships)
  update public.employee_profiles ep
     set tenant_id = m.tenant_id,
         updated_at = now()
    from public.memberships m
   where m.id = ep.membership_id
     and m.user_id = p_user_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- If the user has no membership/employee_profile, fail loudly so the hook can surface it.
  if v_updated_count = 0 then
    raise exception 'employee_profiles: no employee profile found for user_id % (no matching membership)', p_user_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."sync_employee_profile_tenant_on_login"("p_user_id" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."access_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_email" "text" NOT NULL,
    "requester_name" "text",
    "target_tenant_id" "uuid",
    "message" "text",
    "status" "public"."access_request_status" DEFAULT 'pending'::"public"."access_request_status" NOT NULL,
    "decided_by" "text",
    "decided_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email_domain" "text" GENERATED ALWAYS AS ("lower"("split_part"("requester_email", '@'::"text", 2))) STORED
);


ALTER TABLE "public"."access_requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."access_requests"."email_domain" IS 'Generated always from requester_email. Never writable directly. Used for domain-based tenant matching and access request routing.';



CREATE TABLE IF NOT EXISTS "public"."attendance_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "employee_id" "text" NOT NULL,
    "site_id" "uuid",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "clock_in" timestamp with time zone,
    "clock_out" timestamp with time zone,
    "method" "public"."check_in_method" DEFAULT 'manual'::"public"."check_in_method" NOT NULL,
    "status" "public"."attendance_status" DEFAULT 'present'::"public"."attendance_status" NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "verified" boolean DEFAULT false NOT NULL,
    "verified_by" "text",
    "hours_worked" numeric(6,2),
    "overtime" numeric(6,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auth0_employee_id" "text"
);


ALTER TABLE "public"."attendance_records" OWNER TO "postgres";


COMMENT ON COLUMN "public"."attendance_records"."hours_worked" IS 'Auto-computed by trg_att_recompute_hours from (clock_out - clock_in). Do not set manually; any supplied value will be overwritten.';



COMMENT ON COLUMN "public"."attendance_records"."overtime" IS 'Auto-computed as MAX(0, hours_worked - 8). Do not set manually; any supplied value will be overwritten.';



CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "user_id" "text",
    "action" "text" NOT NULL,
    "target_table" "text",
    "target_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auth0_user_id" "text"
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth0_sync_outbox" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "event_type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone
);


ALTER TABLE "public"."auth0_sync_outbox" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."department_sites" (
    "department_id" "uuid" NOT NULL,
    "site_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."department_sites" OWNER TO "postgres";


COMMENT ON TABLE "public"."department_sites" IS 'Junction table: resolves the many-to-many between departments and sites. Replaces the 4NF-violating departments.site_id single-FK approach.';



CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "site_id" "uuid"
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."departments"."site_id" IS 'Legacy shortcut: the department''s primary site. Full many-to-many assignments live in department_sites. Do not use as the authoritative source for site membership.';



CREATE TABLE IF NOT EXISTS "public"."employee_profiles" (
    "membership_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "site_id" "uuid",
    "department_id" "uuid",
    "job_title" "text",
    "id_number" "text",
    "date_of_birth" "date",
    "start_date" "date",
    "phone" "text",
    "address" "text",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auth0_user_id" "text"
);


ALTER TABLE "public"."employee_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."employee_profiles"."tenant_id" IS 'Denormalised write-through projection of memberships.tenant_id. Never set manually — overwritten on every INSERT/UPDATE by trg_emp_profile_sync_tenant. Retained for RLS index performance.';



CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "text" NOT NULL,
    "role" "public"."tenant_role" DEFAULT 'employee'::"public"."tenant_role" NOT NULL,
    "status" "public"."membership_status" DEFAULT 'invited'::"public"."membership_status" NOT NULL,
    "invited_by" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "joined_at" timestamp with time zone NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."memberships" OWNER TO "postgres";


COMMENT ON TABLE "public"."memberships" IS 'Active SELECT policies after audit: "Tenant active members can read" — active members only, peer-existence check. "memberships_admin_write" — full CRUD for tenant admins.';



CREATE TABLE IF NOT EXISTS "public"."organisation_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "base_role" "public"."tenant_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organisation_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "public"."tenant_role" NOT NULL,
    "permission" "public"."app_permission" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."role_permissions" IS 'Authoritative role → permission grants. Read by the Express API and the Auth0 post-login Action; mirrored into Auth0 native RBAC by the sync script.';



CREATE TABLE IF NOT EXISTS "public"."sales_leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "company" "text" NOT NULL,
    "employee_count" "text",
    "selected_plan" "text",
    "country" "text",
    "message" "text",
    "status" "public"."lead_status" DEFAULT 'new'::"public"."lead_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sales_leads_selected_plan_check" CHECK ((("selected_plan" IS NULL) OR ("selected_plan" = ANY (ARRAY['starter'::"text", 'growth'::"text", 'pro'::"text", 'enterprise'::"text"]))))
);


ALTER TABLE "public"."sales_leads" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sales_leads"."selected_plan" IS 'Constrained to billing_plan enum values (starter, growth, pro, enterprise) or NULL for leads that have not yet chosen a plan.';



CREATE TABLE IF NOT EXISTS "public"."shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "site_id" "uuid" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "grace_period_minutes" bigint DEFAULT '15'::bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sites" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "address" "text" DEFAULT ''::"text" NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "geofence_radius_m" bigint DEFAULT '200'::bigint NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."sites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "plan" "public"."billing_plan" DEFAULT 'starter'::"public"."billing_plan" NOT NULL,
    "status" "public"."billing_status" DEFAULT 'trialing'::"public"."billing_status" NOT NULL,
    "seat_cap" integer DEFAULT 25 NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "auth0_org_id" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "display_name" "text" DEFAULT ''::"text" NOT NULL,
    "status" "public"."tenant_status" DEFAULT 'provisioning'::"public"."tenant_status" NOT NULL,
    "industry" "text",
    "country" "text" DEFAULT 'South Africa'::"text" NOT NULL,
    "logo_url" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tenants"."auth0_org_id" IS 'Auth0 Organisation ID (format: org_xxxx). Primary bridge between JWT claims and the internal tenant UUID. Must be unique across all tenants.';



CREATE OR REPLACE VIEW "public"."tenant_active_plan" WITH ("security_invoker"='true') AS
 SELECT "t"."id" AS "tenant_id",
    "t"."display_name" AS "tenant_name",
    "t"."auth0_org_id",
    "s"."plan",
    "s"."status" AS "billing_status",
    "s"."seat_cap",
    "s"."current_period_end"
   FROM ("public"."tenants" "t"
     LEFT JOIN "public"."subscriptions" "s" ON ((("s"."tenant_id" = "t"."id") AND ("s"."status" = ANY (ARRAY['active'::"public"."billing_status", 'trialing'::"public"."billing_status"])))));


ALTER VIEW "public"."tenant_active_plan" OWNER TO "postgres";


COMMENT ON VIEW "public"."tenant_active_plan" IS 'Current billing plan for a tenant. Derived from subscriptions — no data is stored twice. Identified by tenant_id (UUID) or auth0_org_id.';



CREATE OR REPLACE VIEW "public"."tenant_subscription_summary" WITH ("security_invoker"='true') AS
 SELECT "tenant_id",
    "plan",
    "status",
    "seat_cap",
    "current_period_end"
   FROM "public"."subscriptions";


ALTER VIEW "public"."tenant_subscription_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."tenant_subscription_summary" IS 'Stripe-ID-free subscription summary. Safe to expose to all tenant members via application-layer queries. Stripe IDs are accessible only through the subscriptions base table, restricted to tenant admins by RLS.';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "avatar_url" "text",
    "status" "public"."user_status" DEFAULT 'active'::"public"."user_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "password_hash" "text",
    "auth0_user_id" "text" DEFAULT ''::"text" NOT NULL,
    "auth0_org_id" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."id" IS 'Text primary key storing the Auth0 sub claim (format: provider|xxxxxxxx). Kept as text to match JWT sub claims without parsing. All FK columns referencing users (employee_id, user_id, verified_by, decided_by) are also text for type consistency.';



COMMENT ON COLUMN "public"."users"."password_hash" IS 'DEPRECATED. Auth0 is the identity provider; this column should be NULL for all users authenticated via Auth0. Scheduled for removal once legacy password-auth paths are confirmed retired. Tracking: set this column to NULL for all rows where auth0_user_id IS NOT NULL before executing the drop-column migration.';



ALTER TABLE ONLY "public"."access_requests"
    ADD CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth0_sync_outbox"
    ADD CONSTRAINT "auth0_sync_outbox_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."department_sites"
    ADD CONSTRAINT "department_sites_pkey" PRIMARY KEY ("department_id", "site_id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_profiles"
    ADD CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("membership_id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_tenant_user_unique" UNIQUE ("tenant_id", "user_id");



ALTER TABLE ONLY "public"."organisation_roles"
    ADD CONSTRAINT "organisation_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organisation_roles"
    ADD CONSTRAINT "organisation_roles_tenant_name_key" UNIQUE ("tenant_id", "name");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_permission_key" UNIQUE ("role", "permission");



ALTER TABLE ONLY "public"."sales_leads"
    ADD CONSTRAINT "sales_leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sites"
    ADD CONSTRAINT "sites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_tenant_id_key" UNIQUE ("tenant_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_auth0_org_id_key" UNIQUE ("auth0_org_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_auth0_user_id_key" UNIQUE ("auth0_user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "access_req_domain_idx" ON "public"."access_requests" USING "btree" ("email_domain", "status");



CREATE INDEX "att_tenant_emp_date_idx" ON "public"."attendance_records" USING "btree" ("tenant_id", "employee_id", "date");



CREATE INDEX "att_tenant_site_date_idx" ON "public"."attendance_records" USING "btree" ("tenant_id", "site_id", "date");



CREATE INDEX "audit_tenant_time_idx" ON "public"."audit_log" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "auth0_sync_outbox_status_idx" ON "public"."auth0_sync_outbox" USING "btree" ("status", "created_at");



CREATE INDEX "departments_tenant_idx" ON "public"."departments" USING "btree" ("tenant_id", "site_id");



CREATE INDEX "dept_sites_dept_idx" ON "public"."department_sites" USING "btree" ("department_id");



CREATE INDEX "dept_sites_site_idx" ON "public"."department_sites" USING "btree" ("site_id", "tenant_id");



CREATE INDEX "emp_profiles_tenant_idx" ON "public"."employee_profiles" USING "btree" ("tenant_id", "site_id");



CREATE INDEX "memberships_tenant_idx" ON "public"."memberships" USING "btree" ("tenant_id", "status");



CREATE INDEX "memberships_user_tenant_idx" ON "public"."memberships" USING "btree" ("user_id", "tenant_id");



CREATE INDEX "org_roles_tenant_idx" ON "public"."organisation_roles" USING "btree" ("tenant_id");



CREATE INDEX "role_permissions_role_idx" ON "public"."role_permissions" USING "btree" ("role");



CREATE INDEX "shifts_tenant_idx" ON "public"."shifts" USING "btree" ("tenant_id", "site_id");



CREATE INDEX "sites_tenant_idx" ON "public"."sites" USING "btree" ("tenant_id");



CREATE INDEX "subs_stripe_customer_idx" ON "public"."subscriptions" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);



CREATE INDEX "subs_stripe_sub_idx" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id") WHERE ("stripe_subscription_id" IS NOT NULL);



CREATE UNIQUE INDEX "tenants_auth0_org_id_uidx" ON "public"."tenants" USING "btree" ("auth0_org_id");



CREATE OR REPLACE TRIGGER "defensive_set_tenant_id" BEFORE INSERT ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."defensive_set_tenant_id"();



CREATE OR REPLACE TRIGGER "on_tenant_access_sync" BEFORE INSERT OR UPDATE ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."handle_user_sync"();



CREATE OR REPLACE TRIGGER "on_tenant_access_sync_trigger" BEFORE INSERT ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."handle_user_sync_from_jwt"();



CREATE OR REPLACE TRIGGER "trg_att_audit" AFTER INSERT OR UPDATE ON "public"."attendance_records" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_insert"();



CREATE OR REPLACE TRIGGER "trg_att_recompute_hours" BEFORE INSERT OR UPDATE OF "clock_in", "clock_out" ON "public"."attendance_records" FOR EACH ROW EXECUTE FUNCTION "public"."recompute_attendance_hours"();



CREATE OR REPLACE TRIGGER "trg_att_tenant_match" BEFORE INSERT ON "public"."attendance_records" FOR EACH ROW EXECUTE FUNCTION "public"."assert_tenant_match"();



CREATE OR REPLACE TRIGGER "trg_att_updated" BEFORE UPDATE ON "public"."attendance_records" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_attendance_set_auth0_employee_id" BEFORE INSERT OR UPDATE ON "public"."attendance_records" FOR EACH ROW EXECUTE FUNCTION "public"."set_attendance_auth0_employee_id"();



CREATE OR REPLACE TRIGGER "trg_audit_log_set_auth0_user_id" BEFORE INSERT ON "public"."audit_log" FOR EACH ROW EXECUTE FUNCTION "public"."set_audit_log_auth0_user_id"();



CREATE OR REPLACE TRIGGER "trg_departments_updated" BEFORE UPDATE ON "public"."departments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_dept_sites_tenant_match" BEFORE INSERT ON "public"."department_sites" FOR EACH ROW EXECUTE FUNCTION "public"."assert_tenant_match"();



CREATE OR REPLACE TRIGGER "trg_emp_profile_sync_tenant" BEFORE INSERT OR UPDATE OF "membership_id" ON "public"."employee_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_employee_profile_tenant"();



CREATE OR REPLACE TRIGGER "trg_emp_profiles_updated" BEFORE UPDATE ON "public"."employee_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_employee_profiles_set_auth0_user_id" BEFORE INSERT ON "public"."employee_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_employee_profiles_auth0_user_id"();



CREATE OR REPLACE TRIGGER "trg_mem_audit" AFTER INSERT OR UPDATE ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_insert"();



CREATE OR REPLACE TRIGGER "trg_memberships_seat_cap" BEFORE INSERT ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_seat_cap"();



CREATE OR REPLACE TRIGGER "trg_memberships_sync" AFTER INSERT OR DELETE OR UPDATE ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."enqueue_membership_sync"();



CREATE OR REPLACE TRIGGER "trg_memberships_updated" BEFORE UPDATE ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_org_roles_audit" AFTER INSERT OR UPDATE ON "public"."organisation_roles" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_insert"();



CREATE OR REPLACE TRIGGER "trg_org_roles_updated" BEFORE UPDATE ON "public"."organisation_roles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sites_audit" AFTER INSERT OR UPDATE ON "public"."sites" FOR EACH ROW EXECUTE FUNCTION "public"."audit_log_insert"();



CREATE OR REPLACE TRIGGER "trg_sites_updated" BEFORE UPDATE ON "public"."sites" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_subs_updated" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_tenants_updated" BEFORE UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_users_updated" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."access_requests"
    ADD CONSTRAINT "access_requests_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."access_requests"
    ADD CONSTRAINT "access_requests_target_tenant_id_fkey" FOREIGN KEY ("target_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."department_sites"
    ADD CONSTRAINT "department_sites_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."department_sites"
    ADD CONSTRAINT "department_sites_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."department_sites"
    ADD CONSTRAINT "department_sites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_profiles"
    ADD CONSTRAINT "employee_profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employee_profiles"
    ADD CONSTRAINT "employee_profiles_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_profiles"
    ADD CONSTRAINT "employee_profiles_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employee_profiles"
    ADD CONSTRAINT "employee_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organisation_roles"
    ADD CONSTRAINT "organisation_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



CREATE POLICY "Admins full access to attendance" ON "public"."attendance_records" USING ("public"."has_role_text"("public"."current_user_sub_text"(), 'admin'::"text"));



CREATE POLICY "Admins full access to departments" ON "public"."departments" USING ("public"."has_role_text"("public"."current_user_sub_text"(), 'admin'::"text"));



CREATE POLICY "Admins full access to profiles" ON "public"."employee_profiles" USING ("public"."has_role_text"("public"."current_user_sub_text"(), 'admin'::"text"));



CREATE POLICY "Admins full access to shifts" ON "public"."shifts" USING ("public"."has_role_text"("public"."current_user_sub_text"(), 'admin'::"text"));



CREATE POLICY "Admins full access to sites" ON "public"."sites" USING ("public"."has_role_text"("public"."current_user_sub_text"(), 'admin'::"text"));



CREATE POLICY "Admins read all audit logs" ON "public"."audit_log" FOR SELECT USING ("public"."has_role_text"("public"."current_user_sub_text"(), 'admin'::"text"));



CREATE POLICY "Authenticated users read departments" ON "public"."departments" FOR SELECT USING (("public"."current_user_sub_text"() IS NOT NULL));



CREATE POLICY "Authenticated users read shifts" ON "public"."shifts" FOR SELECT USING (("public"."current_user_sub_text"() IS NOT NULL));



CREATE POLICY "Authenticated users read sites" ON "public"."sites" FOR SELECT USING (("public"."current_user_sub_text"() IS NOT NULL));



CREATE POLICY "Employees can only read profiles within their own organization" ON "public"."employee_profiles" USING (("tenant_id" = (("auth"."jwt"() ->> 'https://easy-ops-za.vercel.app/org_id'::"text"))::"uuid")) WITH CHECK (("tenant_id" = (("auth"."jwt"() ->> 'https://easy-ops-za.vercel.app/org_id'::"text"))::"uuid"));



CREATE POLICY "Employees insert own attendance" ON "public"."attendance_records" FOR INSERT WITH CHECK (("public"."current_user_sub_text"() = "auth0_employee_id"));



CREATE POLICY "Employees read own attendance" ON "public"."attendance_records" FOR SELECT USING (("public"."current_user_sub_text"() = "auth0_employee_id"));



CREATE POLICY "Employees update own attendance" ON "public"."attendance_records" FOR UPDATE USING (("public"."current_user_sub_text"() = "auth0_employee_id"));



CREATE POLICY "Enable read access for all users" ON "public"."tenants" FOR SELECT USING (true);



CREATE POLICY "Enforce organization boundary on employee profiles" ON "public"."employee_profiles" USING (("tenant_id" = (("auth"."jwt"() ->> 'https://easy-ops-za.vercel.app/org_id'::"text"))::"uuid")) WITH CHECK (("tenant_id" = (("auth"."jwt"() ->> 'https://easy-ops-za.vercel.app/org_id'::"text"))::"uuid"));



CREATE POLICY "Enforce organization boundary on memberships" ON "public"."memberships" USING (("tenant_id" = (("auth"."jwt"() ->> 'https://easy-ops-za.vercel.app/org_id'::"text"))::"uuid")) WITH CHECK (("tenant_id" = (("auth"."jwt"() ->> 'https://easy-ops-za.vercel.app/org_id'::"text"))::"uuid"));



CREATE POLICY "Managers read all attendance" ON "public"."attendance_records" FOR SELECT USING ("public"."has_role_text"("public"."current_user_sub_text"(), 'manager'::"text"));



CREATE POLICY "Managers read department profiles" ON "public"."employee_profiles" FOR SELECT USING (("public"."has_role_text"("public"."current_user_sub_text"(), 'manager'::"text") AND ("department_id" = "public"."get_user_department_id"("public"."current_user_sub_text"()))));



CREATE POLICY "Managers verify attendance" ON "public"."attendance_records" FOR UPDATE USING ("public"."has_role_text"("public"."current_user_sub_text"(), 'manager'::"text"));



CREATE POLICY "Supervisors read site profiles" ON "public"."employee_profiles" FOR SELECT USING (("public"."has_role_text"("public"."current_user_sub_text"(), 'supervisor'::"text") AND ("site_id" = "public"."get_user_site_id"("public"."current_user_sub_text"()))));



CREATE POLICY "Supervisors read team attendance" ON "public"."attendance_records" FOR SELECT USING (("public"."has_role_text"("public"."current_user_sub_text"(), 'supervisor'::"text") AND ("auth0_employee_id" IN ( SELECT "ep"."auth0_user_id"
   FROM "public"."employee_profiles" "ep"
  WHERE (("ep"."site_id" = "public"."get_user_site_id"("public"."current_user_sub_text"())) AND ("ep"."auth0_user_id" IS NOT NULL))))));



CREATE POLICY "System insert audit logs" ON "public"."audit_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "Tenant active members can read" ON "public"."memberships" FOR SELECT TO "authenticated" USING ((("status" = 'active'::"public"."membership_status") AND (EXISTS ( SELECT 1
   FROM "public"."memberships" "m2"
  WHERE (("m2"."tenant_id" = "memberships"."tenant_id") AND ("m2"."user_id" = "public"."current_user_id"()) AND ("m2"."status" = 'active'::"public"."membership_status"))))));



CREATE POLICY "Users can only read rows matching their Auth0 organization" ON "public"."memberships" FOR SELECT USING (("tenant_id" = (( SELECT ("auth"."jwt"() ->> 'https://easy-ops-za.vercel.app/org_id'::"text")))::"uuid"));



CREATE POLICY "Users read own audit logs" ON "public"."audit_log" FOR SELECT USING (("public"."current_user_sub_text"() = "auth0_user_id"));



CREATE POLICY "Users read own profile" ON "public"."employee_profiles" FOR SELECT USING (("public"."current_user_sub_text"() = "auth0_user_id"));



CREATE POLICY "Users update own profile" ON "public"."employee_profiles" FOR UPDATE USING (("public"."current_user_sub_text"() = "auth0_user_id"));



CREATE POLICY "access_req_public_insert" ON "public"."access_requests" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("requester_email" IS NOT NULL) AND (("length"(TRIM(BOTH FROM "requester_email")) >= 3) AND ("length"(TRIM(BOTH FROM "requester_email")) <= 255)) AND ("requester_email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::"text") AND (("requester_name" IS NULL) OR ("length"("requester_name") <= 200)) AND (("message" IS NULL) OR ("length"("message") <= 4000)) AND ("status" = 'pending'::"public"."access_request_status")));



CREATE POLICY "access_req_target_admin_read" ON "public"."access_requests" FOR SELECT TO "authenticated" USING ((("target_tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role")));



CREATE POLICY "access_req_target_admin_update" ON "public"."access_requests" FOR UPDATE TO "authenticated" USING ((("target_tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role"))) WITH CHECK ((("target_tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role")));



ALTER TABLE "public"."access_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "att_mgr_read" ON "public"."attendance_records" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."has_tenant_role"('manager'::"public"."tenant_role") OR "public"."has_tenant_role"('supervisor'::"public"."tenant_role") OR "public"."has_tenant_role"('admin'::"public"."tenant_role"))));



CREATE POLICY "att_mgr_verify" ON "public"."attendance_records" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."has_tenant_role"('manager'::"public"."tenant_role") OR "public"."has_tenant_role"('admin'::"public"."tenant_role"))));



CREATE POLICY "att_self_rw" ON "public"."attendance_records" TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("employee_id" = "public"."current_user_id"()))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("employee_id" = "public"."current_user_id"())));



CREATE POLICY "att_supervisor_verify" ON "public"."attendance_records" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('supervisor'::"public"."tenant_role")));



ALTER TABLE "public"."attendance_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_insert_self" ON "public"."audit_log" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "public"."current_user_id"()) AND (("tenant_id" IS NULL) OR ("tenant_id" = "public"."current_tenant_id"()))));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_self_read" ON "public"."audit_log" FOR SELECT TO "authenticated" USING (("user_id" = "public"."current_user_id"()));



CREATE POLICY "audit_tenant_admin_read" ON "public"."audit_log" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role")));



ALTER TABLE "public"."auth0_sync_outbox" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."department_sites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "departments_admin_write" ON "public"."departments" TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role"))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role")));



CREATE POLICY "departments_tenant_read" ON "public"."departments" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "dept_sites_admin_write" ON "public"."department_sites" TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role"))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role")));



CREATE POLICY "dept_sites_tenant_read" ON "public"."department_sites" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "emp_profiles_admin_all" ON "public"."employee_profiles" TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role"))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role")));



CREATE POLICY "emp_profiles_mgr_read" ON "public"."employee_profiles" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."has_tenant_role"('manager'::"public"."tenant_role") OR "public"."has_tenant_role"('supervisor'::"public"."tenant_role"))));



CREATE POLICY "emp_profiles_self_read" ON "public"."employee_profiles" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."id" = "employee_profiles"."membership_id") AND ("m"."user_id" = "public"."current_user_id"()))))));



CREATE POLICY "emp_profiles_self_update" ON "public"."employee_profiles" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."id" = "employee_profiles"."membership_id") AND ("m"."user_id" = "public"."current_user_id"()))))));



ALTER TABLE "public"."employee_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "leads_platform_admin_read" ON "public"."sales_leads" FOR SELECT TO "authenticated" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'platform_admin'::"text"))::boolean IS TRUE));



CREATE POLICY "leads_public_insert" ON "public"."sales_leads" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("email" IS NOT NULL) AND (("length"(TRIM(BOTH FROM "email")) >= 3) AND ("length"(TRIM(BOTH FROM "email")) <= 255)) AND ("email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::"text") AND (("full_name" IS NULL) OR ("length"("full_name") <= 200)) AND (("company" IS NULL) OR ("length"("company") <= 200)) AND (("message" IS NULL) OR ("length"("message") <= 4000))));



CREATE POLICY "members_invite_perm" ON "public"."memberships" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_permission"('members:invite'::"public"."app_permission")));



CREATE POLICY "members_manage_perm" ON "public"."memberships" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_permission"('members:manage'::"public"."app_permission"))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_permission"('members:manage'::"public"."app_permission")));



ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "memberships_admin_write" ON "public"."memberships" TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role"))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role")));



CREATE POLICY "org_roles_admin_write" ON "public"."organisation_roles" TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role"))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role")));



CREATE POLICY "org_roles_tenant_read" ON "public"."organisation_roles" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."organisation_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "outbox_admin_read" ON "public"."auth0_sync_outbox" FOR SELECT TO "authenticated" USING (((("tenant_id" IS NULL) OR ("tenant_id" = "public"."current_tenant_id"())) AND "public"."has_tenant_role"('admin'::"public"."tenant_role")));



ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_permissions_read_all" ON "public"."role_permissions" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."sales_leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shifts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shifts_admin_write" ON "public"."shifts" TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role"))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role")));



CREATE POLICY "shifts_tenant_read" ON "public"."shifts" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."sites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sites_admin_write" ON "public"."sites" TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role"))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role")));



CREATE POLICY "sites_tenant_read" ON "public"."sites" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "subs_admin_read" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role")));



ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenants_admin_update" ON "public"."tenants" FOR UPDATE TO "authenticated" USING ((("id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role"))) WITH CHECK ((("id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role")));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_self_read" ON "public"."users" FOR SELECT TO "authenticated" USING (("id" = "public"."current_user_id"()));



CREATE POLICY "users_self_update" ON "public"."users" FOR UPDATE TO "authenticated" USING (("id" = "public"."current_user_id"())) WITH CHECK (("id" = "public"."current_user_id"()));



CREATE POLICY "users_tenant_admin_read" ON "public"."users" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."memberships" "m"
  WHERE (("m"."user_id" = "users"."id") AND ("m"."tenant_id" = "public"."current_tenant_id"()) AND "public"."has_tenant_role"('admin'::"public"."tenant_role")))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."approve_access_request_and_invite"("p_request_id" "uuid", "p_default_role" "public"."tenant_role") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_access_request_and_invite"("p_request_id" "uuid", "p_default_role" "public"."tenant_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_access_request_and_invite"("p_request_id" "uuid", "p_default_role" "public"."tenant_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."assert_tenant_match"() TO "anon";
GRANT ALL ON FUNCTION "public"."assert_tenant_match"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assert_tenant_match"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_log_insert"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_log_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_password"("p_email" "text", "p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_password"("p_email" "text", "p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_password"("p_email" "text", "p_password" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_tenant_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_sub_text"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_sub_text"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_sub_text"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."defensive_set_tenant_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."defensive_set_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_seat_cap"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_seat_cap"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_seat_cap"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enqueue_membership_sync"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enqueue_membership_sync"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_department_id"("_auth0_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_department_id"("_auth0_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_department_id"("_auth0_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_site_id"("_auth0_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_site_id"("_auth0_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_site_id"("_auth0_user_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_user_sync"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_user_sync"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_user_sync_from_jwt"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_user_sync_from_jwt"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_permission"("_perm" "public"."app_permission") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_permission"("_perm" "public"."app_permission") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("_perm" "public"."app_permission") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role_text"("_auth0_user_id" "text", "_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role_text"("_auth0_user_id" "text", "_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role_text"("_auth0_user_id" "text", "_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_tenant_role"("_role" "public"."tenant_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_tenant_role"("_role" "public"."tenant_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_tenant_role"("_role" "public"."tenant_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_attendance_hours"() TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_attendance_hours"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_attendance_hours"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_attendance_auth0_employee_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_attendance_auth0_employee_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_attendance_auth0_employee_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_audit_log_auth0_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_audit_log_auth0_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_audit_log_auth0_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_employee_profiles_auth0_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_employee_profiles_auth0_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_employee_profiles_auth0_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_employee_profile_tenant"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_employee_profile_tenant"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_employee_profile_tenant_on_login"("p_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_employee_profile_tenant_on_login"("p_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_employee_profile_tenant_on_login"("p_user_id" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."access_requests" TO "anon";
GRANT ALL ON TABLE "public"."access_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."access_requests" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_records" TO "anon";
GRANT ALL ON TABLE "public"."attendance_records" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_records" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."auth0_sync_outbox" TO "anon";
GRANT ALL ON TABLE "public"."auth0_sync_outbox" TO "authenticated";
GRANT ALL ON TABLE "public"."auth0_sync_outbox" TO "service_role";



GRANT ALL ON TABLE "public"."department_sites" TO "anon";
GRANT ALL ON TABLE "public"."department_sites" TO "authenticated";
GRANT ALL ON TABLE "public"."department_sites" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."employee_profiles" TO "anon";
GRANT ALL ON TABLE "public"."employee_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."memberships" TO "anon";
GRANT ALL ON TABLE "public"."memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."memberships" TO "service_role";



GRANT ALL ON TABLE "public"."organisation_roles" TO "anon";
GRANT ALL ON TABLE "public"."organisation_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."organisation_roles" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."sales_leads" TO "anon";
GRANT ALL ON TABLE "public"."sales_leads" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_leads" TO "service_role";



GRANT ALL ON TABLE "public"."shifts" TO "anon";
GRANT ALL ON TABLE "public"."shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."shifts" TO "service_role";



GRANT ALL ON TABLE "public"."sites" TO "anon";
GRANT ALL ON TABLE "public"."sites" TO "authenticated";
GRANT ALL ON TABLE "public"."sites" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_active_plan" TO "anon";
GRANT ALL ON TABLE "public"."tenant_active_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_active_plan" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_subscription_summary" TO "anon";
GRANT ALL ON TABLE "public"."tenant_subscription_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_subscription_summary" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































drop policy "access_req_public_insert" on "public"."access_requests";

drop policy "leads_public_insert" on "public"."sales_leads";


  create policy "access_req_public_insert"
  on "public"."access_requests"
  as permissive
  for insert
  to anon, authenticated
with check (((requester_email IS NOT NULL) AND ((length(TRIM(BOTH FROM requester_email)) >= 3) AND (length(TRIM(BOTH FROM requester_email)) <= 255)) AND (requester_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+;
::text) AND ((requester_name IS NULL) OR (length(requester_name) <= 200)) AND ((message IS NULL) OR (length(message) <= 4000)) AND (status = 'pending'::public.access_request_status)));



  create policy "leads_public_insert"
  on "public"."sales_leads"
  as permissive
  for insert
  to anon, authenticated
with check (((email IS NOT NULL) AND ((length(TRIM(BOTH FROM email)) >= 3) AND (length(TRIM(BOTH FROM email)) <= 255)) AND (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+;
::text) AND ((full_name IS NULL) OR (length(full_name) <= 200)) AND ((company IS NULL) OR (length(company) <= 200)) AND ((message IS NULL) OR (length(message) <= 4000))));



