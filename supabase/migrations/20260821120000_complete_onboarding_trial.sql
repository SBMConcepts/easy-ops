-- Some environments pre-created org_plan with 'free'; the app uses 'trial'.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'org_plan' AND e.enumlabel = 'free'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'org_plan' AND e.enumlabel = 'trial'
  ) THEN
    ALTER TYPE public.org_plan RENAME VALUE 'free' TO 'trial';
  END IF;
END
$$;

-- Some environments allow billing_state 'free'/'trialing'; the app uses 'trial'.
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_state_chk;
UPDATE public.subscriptions SET billing_state = 'trial' WHERE billing_state IN ('free', 'trialing');
ALTER TABLE public.subscriptions ALTER COLUMN billing_state SET DEFAULT 'trial';
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_billing_state_chk CHECK (
    billing_state IN ('trial', 'pending_payment_method', 'active', 'past_due', 'cancelled')
  );

-- Atomically provisions the workspace and starts the free trial. Called by the API over HTTPS
-- (service role) so onboarding does not depend on a direct Postgres connection.
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_org_id text,
  p_payload jsonb,
  p_trial_days integer DEFAULT 7
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_org public.organizations%ROWTYPE;
  v_first_dept uuid;
  v_dept_id uuid;
  v_item jsonb;
  v_name text;
  v_base text;
  v_seen text[] := ARRAY[]::text[];
  v_has_sites boolean := false;
  v_trial_end timestamptz := now() + make_interval(days => p_trial_days);
  v_departments jsonb := CASE WHEN jsonb_typeof(p_payload -> 'departments') = 'array' THEN p_payload -> 'departments' ELSE '[]'::jsonb END;
  v_sites jsonb := CASE WHEN jsonb_typeof(p_payload -> 'sites') = 'array' THEN p_payload -> 'sites' ELSE '[]'::jsonb END;
  v_roles jsonb := CASE WHEN jsonb_typeof(p_payload -> 'roles') = 'array' THEN p_payload -> 'roles' ELSE '[]'::jsonb END;
  v_shifts jsonb := CASE WHEN jsonb_typeof(p_payload -> 'shifts') = 'array' THEN p_payload -> 'shifts' ELSE '[]'::jsonb END;
BEGIN
  SELECT * INTO v_org FROM public.organizations WHERE auth0_org_id = p_org_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found.';
  END IF;
  IF v_org.status = 'active' THEN
    RETURN jsonb_build_object('alreadyCompleted', true);
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_departments) LOOP
    v_name := btrim(coalesce(v_item ->> 'name', ''));
    CONTINUE WHEN v_name = '';
    INSERT INTO public.org_departments (auth0_org_id, department_name)
    VALUES (p_org_id, v_name) RETURNING id INTO v_dept_id;
    v_first_dept := coalesce(v_first_dept, v_dept_id);
  END LOOP;

  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_sites) s WHERE btrim(coalesce(s ->> 'name', '')) <> ''
  ) INTO v_has_sites;

  IF v_has_sites AND v_first_dept IS NULL THEN
    INSERT INTO public.org_departments (auth0_org_id, department_name)
    VALUES (p_org_id, 'General') RETURNING id INTO v_first_dept;
  END IF;

  IF v_first_dept IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_sites) LOOP
      v_name := btrim(coalesce(v_item ->> 'name', ''));
      CONTINUE WHEN v_name = '';
      INSERT INTO public.org_sites
        (auth0_org_id, site_name, address, latitude, longitude, geo_radius_m, department_id)
      VALUES (
        p_org_id,
        v_name,
        coalesce(v_item ->> 'address', ''),
        coalesce((v_item ->> 'latitude')::double precision, 0),
        coalesce((v_item ->> 'longitude')::double precision, 0),
        coalesce((v_item ->> 'geofence_radius_m')::numeric, 0),
        v_first_dept
      );
    END LOOP;
  END IF;

  v_seen := ARRAY[]::text[];
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_roles) LOOP
    v_name := btrim(coalesce(v_item ->> 'name', ''));
    CONTINUE WHEN v_name = '' OR lower(v_name) = ANY (v_seen);
    v_seen := v_seen || lower(v_name);
    v_base := lower(btrim(coalesce(v_item ->> 'base_role', '')));
    INSERT INTO public.org_roles (auth0_org_id, name, base_role)
    VALUES (
      p_org_id,
      v_name,
      CASE WHEN v_base IN ('owner', 'admin', 'manager', 'member') THEN v_base::public.org_role ELSE NULL END
    );
  END LOOP;

  v_seen := ARRAY[]::text[];
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_shifts) LOOP
    v_name := btrim(coalesce(v_item ->> 'name', ''));
    CONTINUE WHEN v_name = ''
      OR coalesce(v_item ->> 'start_time', '') = ''
      OR coalesce(v_item ->> 'end_time', '') = ''
      OR lower(v_name) = ANY (v_seen);
    v_seen := v_seen || lower(v_name);
    INSERT INTO public.org_shifts
      (auth0_org_id, shift_name, start_time, end_time, grace_period_minutes, weekly_hours)
    VALUES (
      p_org_id,
      v_name,
      (v_item ->> 'start_time')::time,
      (v_item ->> 'end_time')::time,
      coalesce((v_item ->> 'grace_period_minutes')::integer, 0),
      (v_item ->> 'weekly_hours')::numeric
    );
  END LOOP;

  UPDATE public.organizations
  SET status = 'active',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'workRules', CASE WHEN jsonb_typeof(p_payload -> 'workRules') = 'object' THEN p_payload -> 'workRules' ELSE '{}'::jsonb END,
        'checkInMethods', CASE WHEN jsonb_typeof(p_payload -> 'checkInMethods') = 'object' THEN p_payload -> 'checkInMethods' ELSE '{}'::jsonb END,
        'shifts', v_shifts
      ),
      name = coalesce(nullif(btrim(coalesce(p_payload #>> '{company,name}', '')), ''), name),
      country = coalesce(p_payload #>> '{company,country}', country),
      industry = coalesce(p_payload #>> '{company,industry}', industry),
      updated_at = now()
  WHERE auth0_org_id = p_org_id;

  -- The trial clock starts at onboarding completion, and only once.
  UPDATE public.subscriptions
  SET status = 'trial',
      billing_state = 'trial',
      trial_started_at = now(),
      trial_ends_at = v_trial_end,
      access_ends_at = v_trial_end,
      updated_at = now()
  WHERE auth0_org_id = p_org_id
    AND trial_started_at IS NULL
    AND billing_state IN ('trial', 'pending_payment_method');

  RETURN jsonb_build_object('alreadyCompleted', false, 'trialEndsAt', v_trial_end);
END
$fn$;

REVOKE ALL ON FUNCTION public.complete_onboarding(text, jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(text, jsonb, integer) TO service_role;
