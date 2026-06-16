-- =============================================================================
-- Remove Auth0 / OAuth integration — move identity onto the Supabase platform
-- =============================================================================
-- This migration retires Auth0 as the identity provider and rewires the schema
-- to authenticate and authorise exclusively through Supabase Auth (GoTrue).
--
-- What changes:
--   1. Identity is keyed on Supabase auth.users(id). public.users.id stores that
--      uid; a trigger provisions the profile row on sign-up.
--   2. Auth0-specific columns are dropped: tenants.auth0_org_id,
--      users.auth0_user_id, users.password_hash.
--   3. RLS helper functions stop reading the Auth0 `org_id` JWT claim and instead
--      resolve identity/tenancy from auth.uid() + public.memberships. Every
--      existing policy expressed as `tenant_id = current_tenant_id()` /
--      `has_tenant_role(...)` keeps working unchanged.
--
-- Notes:
--   * public.users.id is kept as TEXT (it now holds the Supabase uid as text)
--     so the many FK columns referencing it (memberships.user_id,
--     attendance_records.employee_id / verified_by, access_requests.decided_by,
--     audit_log.user_id, ...) do not all have to be re-typed. The value is the
--     authoritative Supabase auth uid in every row.
--   * Safe to run more than once: every step is guarded.
-- =============================================================================


-- =============================================================================
-- SECTION 1: tenant_active_plan view — drop dependency on auth0_org_id
-- =============================================================================
-- The view selects t.auth0_org_id, so it must be dropped before the column can
-- be removed, then recreated without it.

DROP VIEW IF EXISTS public.tenant_active_plan;


-- =============================================================================
-- SECTION 2: Drop Auth0-specific columns
-- =============================================================================

-- tenants.auth0_org_id — the Auth0 Organisation bridge. Tenancy is now resolved
-- through public.memberships, so this column and its uniqueness guard are gone.
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_auth0_org_id_key;
DROP INDEX IF EXISTS public.idx_tenants_auth0_org_id;
ALTER TABLE public.tenants DROP COLUMN IF EXISTS auth0_org_id;

-- users.auth0_user_id — the Auth0 sub mirror. public.users.id now equals the
-- Supabase auth uid, so a separate Auth0 id column is dead weight.
DROP INDEX IF EXISTS public.idx_users_auth0_user_id;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth0_user_id_key;
ALTER TABLE public.users DROP COLUMN IF EXISTS auth0_user_id;

-- users.password_hash — passwords are owned by Supabase Auth (auth.users), never
-- stored in the application schema.
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;

COMMENT ON COLUMN public.users.id IS
  'Primary key holding the Supabase Auth user id (auth.users.id) as text. '
  'Provisioned by the handle_new_user trigger on sign-up. All FK columns '
  'referencing users (user_id, employee_id, verified_by, decided_by) are text '
  'for type consistency.';


-- =============================================================================
-- SECTION 3: Recreate tenant_active_plan without auth0_org_id
-- =============================================================================
-- security_invoker so the view honours the querying user's RLS instead of the
-- view owner's (Postgres 15+ / Supabase default).

CREATE VIEW public.tenant_active_plan
  WITH (security_invoker = true) AS
  SELECT
    t.id                  AS tenant_id,
    t.name                AS tenant_name,
    s.plan,
    s.status              AS billing_status,
    s.seat_cap,
    s.current_period_end
  FROM public.tenants t
  LEFT JOIN public.subscriptions s
         ON s.tenant_id = t.id
        AND s.status IN ('active', 'trialing');

COMMENT ON VIEW public.tenant_active_plan IS
  'Current billing plan for a tenant, derived from subscriptions. '
  'Identified by tenant_id (UUID).';


-- =============================================================================
-- SECTION 4: RLS helper functions — resolve identity from Supabase Auth
-- =============================================================================
-- These replace the Auth0 implementations that read the `org_id` custom claim.
-- They are SECURITY DEFINER + STABLE and pinned to an empty search_path with
-- fully-qualified names (Supabase security guidance).

-- current_user_id() — the authenticated Supabase user id as text.
-- Replaces any Auth0-sub-based implementation.
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (auth.uid())::text;
$$;

COMMENT ON FUNCTION public.current_user_id() IS
  'Authenticated Supabase auth.uid() as text. Matches public.users.id and all '
  'user-referencing FK columns.';

-- current_tenant_id() — the caller''s active tenant.
-- Previously read tenants.auth0_org_id = (auth.jwt() ->> ''org_id''). Now derived
-- from the caller''s active membership. When a user belongs to several tenants,
-- the earliest-joined active membership wins (deterministic, ORDER BY joined_at).
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT m.tenant_id
    FROM public.memberships m
   WHERE m.user_id = (auth.uid())::text
     AND m.status = 'active'::public.membership_status
   ORDER BY m.joined_at ASC NULLS LAST
   LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_tenant_id() IS
  'Active tenant for the authenticated user, resolved from public.memberships '
  '(earliest active membership). Replaces the Auth0 org_id claim lookup.';

-- has_tenant_role(_role) — does the caller hold _role in their active tenant?
-- 'owner' is treated as a superset of every role.
CREATE OR REPLACE FUNCTION public.has_tenant_role(_role public.tenant_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.memberships m
     WHERE m.user_id = (auth.uid())::text
       AND m.status = 'active'::public.membership_status
       AND m.tenant_id = public.current_tenant_id()
       AND (m.role = _role OR m.role = 'owner'::public.tenant_role)
  );
$$;

COMMENT ON FUNCTION public.has_tenant_role(public.tenant_role) IS
  'True when the authenticated user holds the given role (or owner) in their '
  'active tenant. Replaces the Auth0 role-claim check.';

-- is_tenant_member(_tenant_id) — membership predicate for multi-tenant reads.
-- Use in new policies that should match ANY tenant the user belongs to rather
-- than only their single active tenant.
CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.memberships m
     WHERE m.user_id = (auth.uid())::text
       AND m.status = 'active'::public.membership_status
       AND m.tenant_id = _tenant_id
  );
$$;

COMMENT ON FUNCTION public.is_tenant_member(uuid) IS
  'True when the authenticated user has an active membership in _tenant_id.';


-- =============================================================================
-- SECTION 5: Provision public.users on Supabase sign-up
-- =============================================================================
-- Replaces the Auth0 post-login / post-user-registration webhook. When GoTrue
-- creates an auth.users row (direct sign-up OR an admin invite), mirror the
-- minimal profile into public.users.
--
-- The invite flows (tenant-provision, tenant-invite-member, access-request-
-- approve) create the auth user first and then upsert public.users + the
-- membership keyed on the real auth uid, so there is no separate 'pending|email'
-- placeholder to reconcile here. This trigger therefore only needs to guarantee
-- a profile row exists, and to activate any membership that was pre-staged as
-- 'invited' for this uid.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email     text := lower(trim(NEW.email));
  v_full_name text := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), ''),
    NEW.email
  );
  v_avatar    text := NULLIF(trim(NEW.raw_user_meta_data ->> 'avatar_url'), '');
BEGIN
  -- Ensure a profile row exists for this auth uid. If an invite flow already
  -- inserted it, refresh the display fields and mark the account active.
  INSERT INTO public.users (id, email, full_name, avatar_url, status)
  VALUES (NEW.id::text, v_email, v_full_name, v_avatar, 'active'::public.user_status)
  ON CONFLICT (id) DO UPDATE
     SET full_name  = EXCLUDED.full_name,
         avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
         status     = 'active'::public.user_status,
         updated_at = now();

  -- Activate any membership left 'invited' now that the user has authenticated.
  UPDATE public.memberships m
     SET status     = 'active'::public.membership_status,
         joined_at  = COALESCE(m.joined_at, now()),
         updated_at = now()
   WHERE m.user_id = NEW.id::text
     AND m.status = 'invited'::public.membership_status;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Mirrors a new Supabase auth.users row into public.users and activates any '
  'pending invited membership. Replaces the Auth0 auth-sync webhook.';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- SECTION 6: Let authenticated users read their own permission grants
-- =============================================================================
-- The frontend gates UI on role_permissions (source of truth) instead of Auth0
-- JWT custom claims. Expose the rows for the caller''s active role under RLS.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'role_permissions'
  ) THEN
    EXECUTE 'ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "role_permissions_read_own_role" ON public.role_permissions';
    EXECUTE $pol$
      CREATE POLICY "role_permissions_read_own_role"
        ON public.role_permissions
        AS PERMISSIVE FOR SELECT TO authenticated
        USING (
          role IN (
            SELECT m.role
              FROM public.memberships m
             WHERE m.user_id = (auth.uid())::text
               AND m.status = 'active'::public.membership_status
          )
        )
    $pol$;
  END IF;
END$$;
