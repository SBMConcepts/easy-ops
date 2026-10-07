-- Ensure schemas exist
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS auth0;

-- If you use extensions.citext, create it too (optional; your types/functions don't depend on it)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

DO $types$
DECLARE
  i int;
  v_type text;
  v_enum_sql text[];
  v_exists boolean;
BEGIN
  -- 1) Create ENUM types if missing
  -- Each element is: { type_name, enum_label_1, enum_label_2, ... }
  -- We build a SQL list: 'a','b','c'
  FOR i IN 1..20 LOOP
    -- map i -> type + labels
    CASE i
      WHEN 1 THEN v_type := 'org_plan';                 v_enum_sql := ARRAY['trial','starter','growth','pro','enterprise'];
      WHEN 2 THEN v_type := 'org_status';               v_enum_sql := ARRAY['provisioning','active','suspended','cancelled'];
      WHEN 3 THEN v_type := 'org_role';                 v_enum_sql := ARRAY['owner','admin','manager','member'];
      WHEN 4 THEN v_type := 'member_status';            v_enum_sql := ARRAY['active','suspended'];

      WHEN 5 THEN v_type := 'employment_type';          v_enum_sql := ARRAY['permanent','contract','part_time','temporary','shift_worker'];
      WHEN 6 THEN v_type := 'identification_type';      v_enum_sql := ARRAY['sa_id','passport'];
      WHEN 7 THEN v_type := 'credential_status';        v_enum_sql := ARRAY['active','blocked','deleted'];
      WHEN 8 THEN v_type := 'subscription_status';      v_enum_sql := ARRAY['trial','active','past_due','cancelled'];

      WHEN 9 THEN v_type := 'leave_type';               v_enum_sql := ARRAY['annual','sick','family_responsibility'];
      WHEN 10 THEN v_type := 'attendance_method';      v_enum_sql := ARRAY['whatsapp','biometric','ussd','qr'];
      WHEN 11 THEN v_type := 'forecast_alert_type';  v_enum_sql := ARRAY['understaffed','overstaffed','overtime_risk','absence_spike','coverage_gap'];
      WHEN 12 THEN v_type := 'forecast_alert_severity'; v_enum_sql := ARRAY['low','medium','high','critical'];
      WHEN 13 THEN v_type := 'forecast_alert_status'; v_enum_sql := ARRAY['open','acknowledged','resolved','dismissed'];

      WHEN 14 THEN v_type := 'support_ticket_category'; v_enum_sql := ARRAY['general','billing','technical','onboarding','feature_request','bug'];
      WHEN 15 THEN v_type := 'support_ticket_priority'; v_enum_sql := ARRAY['low','medium','high','urgent'];
      WHEN 16 THEN v_type := 'support_ticket_status';  v_enum_sql := ARRAY['open','pending','in_progress','resolved','closed'];
      WHEN 17 THEN v_type := 'support_message_author';v_enum_sql := ARRAY['customer','agent','system'];

      WHEN 18 THEN v_type := 'incident_type';          v_enum_sql := ARRAY['injury','near_miss','property_damage','environmental','SECURITY','vehicle','other'];
      WHEN 19 THEN v_type := 'incident_severity';      v_enum_sql := ARRAY['minor','moderate','serious','fatal'];
      WHEN 20 THEN v_type := 'incident_status';        v_enum_sql := ARRAY['open','under_review','closed'];
    END CASE;

    SELECT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = v_type
    ) INTO v_exists;

    IF NOT v_exists THEN
      EXECUTE format(
        'CREATE TYPE public.%I AS ENUM (%s);',
        v_type,
        (SELECT string_agg(quote_literal(x), ',') FROM unnest(v_enum_sql) x)
      );
    END IF;
  END LOOP;

-- Add payroll export format type too
IF NOT EXISTS (
  SELECT 1
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public'
    AND t.typname = 'payroll_export_format'
) THEN
  EXECUTE $sql$
    CREATE TYPE public.payroll_export_format AS ENUM
      ('csv','xlsx','sage','pastel','xero','custom')
  $sql$;
END IF;
END;
$types$;


-- ============================================================================
-- auth0.* functions (JWT claims helpers)
-- ============================================================================

CREATE OR REPLACE FUNCTION auth0.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

COMMENT ON FUNCTION auth0.jwt() IS
'decoded auth0 jwt claims for the current request, OR {} WHEN unauthenticated';


CREATE OR REPLACE FUNCTION auth0.current_org_id()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT nullif(
    coalesce(
      auth0.jwt()->>'org_id',
      auth0.jwt()->>'https://easyops.us.auth0.com/org_id',
      auth0.jwt()->'app_metadata'->>'org_id'
    ),
    ''
  );
$$;


CREATE OR REPLACE FUNCTION auth0.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT nullif(auth0.jwt()->>'sub', '');
$$;


-- Determine current role from org_members
CREATE OR REPLACE FUNCTION auth0.current_role()
RETURNS public.org_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.org_role;
BEGIN
  SELECT m.role
  INTO v_role
  FROM public.org_members m
  WHERE m.auth0_user_id = auth0.current_user_id()
    AND m.auth0_org_id  = auth0.current_org_id()
    AND m.status = 'active'
  LIMIT 1;

  RETURN v_role;
END;
$$;


CREATE OR REPLACE FUNCTION auth0.is_org_member()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT auth0.current_role() IS NOT NULL;
$$;


CREATE OR REPLACE FUNCTION auth0.is_org_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT auth0.current_role() IN ('owner', 'admin');
$$;


CREATE OR REPLACE FUNCTION auth0.is_org_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT auth0.current_role() IN ('owner', 'admin', 'manager');
$$;


-- (Optional but common) default grants for JWT/role helpers
-- Comment out if you manage grants elsewhere.
GRANT EXECUTE ON FUNCTION auth0.jwt() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth0.current_org_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth0.current_user_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth0.current_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth0.is_org_member() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth0.is_org_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth0.is_org_manager() TO authenticated, service_role;


-- ============================================================================
-- public.* trigger helpers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


-- Sync member org id on updates (assumes triggers call this on relevant tables)
CREATE OR REPLACE FUNCTION public.guard_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth0.current_user_id() IS NOT NULL THEN
    NEW.auth0_user_id := auth0.current_user_id();
    NEW.auth0_org_id := auth0.current_org_id();
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.set_ticket_sla()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.sla_response_due IS NULL THEN
    NEW.sla_response_due :=
      NEW.created_at + CASE NEW.priority
        WHEN 'urgent' THEN interval '1 hour'
        WHEN 'high'   THEN interval '4 hours'
        WHEN 'medium' THEN interval '1 day'
        ELSE interval '3 days'
      END;
  END IF;

  IF NEW.sla_resolution_due IS NULL THEN
    NEW.sla_resolution_due :=
      NEW.created_at + CASE NEW.priority
        WHEN 'urgent' THEN interval '8 hours'
        WHEN 'high'   THEN interval '2 days'
        WHEN 'medium' THEN interval '5 days'
        ELSE interval '10 days'
      END;
  END IF;

  RETURN NEW;
END;
$$;


-- Generic trigger: when a parent key is cleared, null out a child FK.
-- Uses tg_argv: [child_table, child_col, parent_col]
CREATE OR REPLACE FUNCTION public.tenant_null_child_ref()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_child_table text := tg_argv[0];
  v_child_col   text := tg_argv[1];
  v_parent_key  text := tg_argv[2];
  v_key_value   text := to_jsonb(OLD)->>tg_argv[2];
BEGIN
  IF v_key_value IS NULL THEN
    RETURN OLD;
  END IF;

  EXECUTE format(
    'UPDATE public.%I
     SET %I = NULL
     WHERE %I::text = $1
       AND auth0_org_id = $2',
    v_child_table,
    v_child_col,
    v_child_col
  )
  USING v_key_value, OLD.auth0_org_id;

  RETURN OLD;
END;
$$;