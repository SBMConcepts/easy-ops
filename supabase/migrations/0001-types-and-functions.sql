DO $$
DECLARE
  v_item text;
  v_count bigint;
BEGIN
IF current_setting('server_version_num')::int < 130000 THEN raise exception 'postgres 13+ required, found %',
current_setting('server_version');
END IF;

foreach v_item IN array array ['authenticated', 'service_role'] LOOP IF NOT EXISTS (
  SELECT 1
  FROM pg_roles
  WHERE rolname = v_item
) THEN raise exception 'role % IS missing. this file targets a supabase project.',
v_item;
END IF;
END LOOP;

foreach v_item IN array array ['pgcrypto', 'citext', 'btree_gist'] LOOP IF NOT EXISTS (
  SELECT 1
  FROM pg_available_extensions
  WHERE name = v_item
) THEN raise exception 'extension % IS not available ON this server',
v_item;
END IF;
END LOOP;


IF to_regclass('public.users') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM public.users WHERE coalesce(auth0_org_id, '''') = ''''' INTO v_count;
IF v_count > 0 THEN raise exception 'preflight: % public.users rows have an empty auth0_org_id. reconcile them (section 12.1) before migrating.',
v_count;
END IF;
END IF;
IF to_regclass('public.org_members') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM public.org_members WHERE coalesce(auth0_org_id, '''') = '''' OR coalesce(auth0_user_id, '''') = ''''' INTO v_count;
IF v_count > 0 THEN raise exception 'preflight: % public.org_members rows have an empty tenant/user key. reconcile them before migrating.',
v_count;
END IF;
EXECUTE 'SELECT count(*) FROM (SELECT auth0_user_id FROM public.org_members group by 1 having count(*) > 1) d' INTO v_count;
IF v_count > 0 THEN raise exception 'preflight: % users belong to more than one organization. this schema enforces one org per user.',
v_count;
END IF;
END IF;
IF to_regclass('public.org_attendance') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM (SELECT auth0_org_id, auth0_user_id, date FROM public.org_attendance group by 1,2,3 having count(*) > 1) d' INTO v_count;
IF v_count > 0 THEN raise exception 'preflight: % duplicate (org, user, date) attendance groups. de-duplicate before the unique key can be added.',
v_count;
END IF;
END IF;
IF to_regclass('public.org_leave_balances') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM (SELECT auth0_org_id, auth0_user_id, leave_type FROM public.org_leave_balances group by 1,2,3 having count(*) > 1) d' INTO v_count;
IF v_count > 0 THEN raise exception 'preflight: % duplicate (org, user, leave_type) balance groups. de-duplicate first.',
v_count;
END IF;
END IF;
IF to_regclass('public.organizations') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM (SELECT slug FROM public.organizations group by 1 having count(*) > 1) d' INTO v_count;
IF v_count > 0 THEN raise exception 'preflight: % duplicate organization slugs. resolve before the unique key can be added.',
v_count;
END IF;
END IF;

END$$;

CREATE schema IF NOT EXISTS extensions;
CREATE extension IF NOT EXISTS pgcrypto WITH schema extensions;

CREATE extension IF NOT EXISTS citext WITH schema extensions;

CREATE extension IF NOT EXISTS btree_gist WITH schema extensions;

CREATE schema IF NOT EXISTS auth0;
revoke all ON schema auth0
FROM public;
GRANT usage ON schema auth0 TO authenticated,
  service_role;

DO $types$
DECLARE v_type text;
v_defs text [] [] := array [
    ['org_plan',                 $$'free','starter','growth','pro','enterprise'$$],
['org_status',               $$'provisioning','active','suspended','cancelled'$$],
['org_role',                 $$'owner','admin','manager','member'$$],
['member_status',            $$'active','suspended'$$],
['employment_type',          $$'permanent','contract','part_time','temporary','shift_worker'$$],
['identification_type',      $$'sa_id','passport'$$],
['credential_status',        $$'active','blocked','deleted'$$],
['subscription_status',      $$'trialing','active','past_due','cancelled'$$],
['leave_type',               $$'annual','sick','family_responsibility'$$],
['attendance_method',        $$'whatsapp','biometric','ussd','qr'$$],
['forecast_alert_type',      $$'understaffed','overstaffed','overtime_risk','absence_spike','coverage_gap'$$],
['forecast_alert_severity',  $$'low','medium','high','critical'$$],
['forecast_alert_status',    $$'open','acknowledged','resolved','dismissed'$$],
['support_ticket_category',  $$'general','billing','technical','onboarding','feature_request','bug'$$],
['support_ticket_priority',  $$'low','medium','high','urgent'$$],
['support_ticket_status',    $$'open','pending','in_progress','resolved','closed'$$],
['support_message_author',   $$'customer','agent','system'$$],
['incident_type',            $$'injury','near_miss','property_damage','environmental','SECURITY','vehicle','other'$$],
['incident_severity',        $$'minor','moderate','serious','fatal'$$],
['incident_status',          $$'open','under_review','closed'$$],
['payroll_export_format',    $$'csv','xlsx','sage','pastel','xero','custom'$$] ];
i int;
BEGIN for i IN 1..array_length(v_defs, 1) LOOP v_type := v_defs [i] [1];
IF NOT EXISTS (
  SELECT 1
  FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public'
    AND t.typname = v_type
) THEN EXECUTE format(
  'CREATE type public.%I -- Get a list of tables and views in the current database
  SELECT table_catalog [database], table_schema [schema], table_name name, table_type type
  FROM INFORMATION_SCHEMA.TABLES
  GO enum (%s)',
  v_type,
  v_defs [i] [2]
);
END IF;
END LOOP;
END $types$;
CREATE OR replace FUNCTION auth0.jwt() RETURNS jsonb LANGUAGE plpgsql stable
SET search_path = '' -- Get a list of tables and views in the current database
SELECT table_catalog [database], table_schema [schema], table_name name, table_type type
FROM INFORMATION_SCHEMA.TABLES
GO $$
SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;
COMMENT ON FUNCTION auth0.jwt() IS 'decoded auth0 jwt claims for the current request, OR {} WHEN unauthenticated';
CREATE OR replace FUNCTION auth0.current_org_id() RETURNS text LANGUAGE plpgsql stable
SET search_path = '' -- Get a list of tables and views in the current database
SELECT table_catalog [database], table_schema [schema], table_name name, table_type type
FROM INFORMATION_SCHEMA.TABLES
GO $$
SELECT nullif(
    coalesce(
      auth0.jwt()->>'org_id',
      auth0.jwt()->>'https://app.example.com/org_id',
      auth0.jwt()->'app_metadata'->>'org_id'
    ),
    ''
  );
$$;
CREATE OR replace FUNCTION auth0.current_user_id() RETURNS text LANGUAGE plpgsql stable
SET search_path = '' -- Get a list of tables and views in the current database
SELECT table_catalog [database], table_schema [schema], table_name name, table_type type
FROM INFORMATION_SCHEMA.TABLES
GO $$
SELECT nullif(auth0.jwt()->>'sub', '');
$$;
CREATE OR replace FUNCTION auth0.current_role() RETURNS public.org_role LANGUAGE plpgsql stable SECURITY definer
SET search_path = '' -- Get a list of tables and views in the current database
SELECT table_catalog [database], table_schema [schema], table_name name, table_type type
FROM INFORMATION_SCHEMA.TABLES
GO $$
DECLARE v_role public.org_role;
BEGIN
SELECT m.role INTO v_role
FROM public.org_members m
WHERE m.auth0_user_id = auth0.current_user_id()
  AND m.auth0_org_id = auth0.current_org_id()
  AND m.status = 'active'
limit 1;
RETURN v_role;
END;
$$;
CREATE OR replace FUNCTION auth0.is_org_member() RETURNS boolean LANGUAGE plpgsql stable
SET search_path = '' -- Get a list of tables and views in the current database
SELECT table_catalog [database], table_schema [schema], table_name name, table_type type
FROM INFORMATION_SCHEMA.TABLES
GO $$
SELECT auth0.current_role() IS NOT NULL;
$$;
CREATE OR replace FUNCTION auth0.is_org_admin() RETURNS boolean LANGUAGE plpgsql stable
SET search_path = '' -- Get a list of tables and views in the current database
SELECT table_catalog [database], table_schema [schema], table_name name, table_type type
FROM INFORMATION_SCHEMA.TABLES
GO $$
SELECT auth0.current_role() IN ('owner', 'admin');
$$;
CREATE OR replace FUNCTION auth0.is_org_manager() RETURNS boolean LANGUAGE plpgsql stable
SET search_path = '' -- Get a list of tables and views in the current database
SELECT table_catalog [database], table_schema [schema], table_name name, table_type type
FROM INFORMATION_SCHEMA.TABLES
GO $$
SELECT auth0.current_role() IN ('owner', 'admin', 'manager');
$$;
revoke all ON FUNCTION auth0.jwt(),
auth0.current_org_id(),
auth0.current_user_id(),
auth0.current_role(),
auth0.is_org_member(),
auth0.is_org_admin(),
auth0.is_org_manager()
FROM public;
GRANT EXECUTE ON FUNCTION auth0.jwt(),
  auth0.current_org_id(),
  auth0.current_user_id(),
  auth0.current_role(),
  auth0.is_org_member(),
  auth0.is_org_admin(),
  auth0.is_org_manager() to authenticated,
  service_role;
CREATE OR replace FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql
SET search_path = '' -- Get a list of tables and views in the current database
SELECT table_catalog [database], table_schema [schema], table_name name, table_type type
FROM INFORMATION_SCHEMA.TABLES
GO $$ BEGIN new.updated_at := now();
RETURN NEW;
END;
$$;
CREATE OR replace FUNCTION public.sync_member_org() RETURNS trigger LANGUAGE plpgsql SECURITY definer
SET search_path = '' -- Get a list of tables and views in the current database
SELECT table_catalog [database], table_schema [schema], table_name name, table_type type
FROM INFORMATION_SCHEMA.TABLES
GO $$ BEGIN
UPDATE public.users u
SET auth0_org_id = new.auth0_org_id
WHERE u.auth0_user_id = new.auth0_user_id
  AND u.auth0_org_id IS DISTINCT FROM new.auth0_org_id;
RETURN NEW;
END;
$$;
CREATE OR replace FUNCTION public.guard_audit_log() RETURNS trigger LANGUAGE plpgsql SECURITY definer
SET search_path = '' -- Get a list of tables and views in the current database
SELECT table_catalog [database], table_schema [schema], table_name name, table_type type
FROM INFORMATION_SCHEMA.TABLES
GO $$ BEGIN IF auth0.current_user_id() IS NOT NULL THEN new.auth0_user_id := auth0.current_user_id();
new.auth0_org_id := auth0.current_org_id();
END IF;
RETURN NEW;
END;
$$;
CREATE OR replace FUNCTION public.set_ticket_sla() RETURNS trigger LANGUAGE plpgsql
SET search_path = '' -- Get a list of tables and views in the current database
SELECT table_catalog [database], table_schema [schema], table_name name, table_type type
FROM INFORMATION_SCHEMA.TABLES
GO $$ BEGIN IF new.sla_response_due IS NULL THEN new.sla_response_due := new.created_at + case
    new.priority
    WHEN 'urgent' THEN interval '1 hour'
    WHEN 'high' THEN interval '4 hours'
    WHEN 'medium' THEN interval '1 day'
    ELSE interval '3 days'
  END;
END IF;
IF new.sla_resolution_due IS NULL THEN new.sla_resolution_due := new.created_at + case
  new.priority
  WHEN 'urgent' THEN interval '8 hours'
  WHEN 'high' THEN interval '2 days'
  WHEN 'medium' THEN interval '5 days'
  ELSE interval '10 days'
END;
END IF;
RETURN NEW;
END;
$$;
CREATE OR replace FUNCTION public.tenant_null_child_ref() RETURNS trigger LANGUAGE plpgsql SECURITY definer
SET search_path = '' -- Get a list of tables and views in the current database
SELECT table_catalog [database], table_schema [schema], table_name name, table_type type
FROM INFORMATION_SCHEMA.TABLES
GO $$
DECLARE v_child_table text := tg_argv [0];
v_child_col text := tg_argv [1];
v_parent_key text := tg_argv [2];
v_key_value text := to_jsonb(old)->>tg_argv [2];
BEGIN IF v_key_value IS NULL THEN RETURN OLD;
END IF;
EXECUTE format(
  'UPDATE public.%I SET %I = NULL WHERE %I::text = $1 and auth0_org_id = $2',
  v_child_table,
  v_child_col,
  v_child_col
) using v_key_value,
old.auth0_org_id;
RETURN OLD;
END;
$$;
