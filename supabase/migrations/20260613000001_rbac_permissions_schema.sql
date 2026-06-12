-- =============================================================================
-- RBAC permissions — schema (Part 1 of 2)
-- =============================================================================
-- Closes the drift between the remote schema (which already has app_permission,
-- role_permissions and has_permission) and the local migration history (which
-- did not define them). Idempotent so it is safe to apply to the live DB and to
-- a freshly reset local DB alike.
--
-- IMPORTANT: enum value additions live here, separate from the seed
-- (20260613000002). New enum values cannot be *used* in the same transaction
-- that adds them, so the INSERT of role_permissions rows must run afterwards.
-- =============================================================================

-- 1. app_permission enum — create with the original 15 values if absent.
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_permission') THEN
    CREATE TYPE public.app_permission AS ENUM (
      'read:tenant', 'write:tenant', 'admin:tenant',
      'read:members', 'invite:members', 'manage:members',
      'read:attendance', 'write:attendance', 'verify:attendance',
      'manage:departments', 'manage:sites', 'manage:shifts', 'manage:roles',
      'read:audit', 'manage:billing'
    );
  END IF;
END 

-- 2. Extend the enum with fine-grained + future-module permissions.
--    ADD VALUE IF NOT EXISTS is a no-op when the value already exists.
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'read:own-profile';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'update:own-profile';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'read:sites';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'read:departments';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'read:shifts';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'read:access-requests';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'approve:access-requests';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'read:compliance';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'read:reports';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'export:reports';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'read:tenant-analytics';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'read:billing';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'export:audit';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'manage:security';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'manage:integrations';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'read:payroll';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'manage:payroll';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'read:benefits';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'manage:benefits';

-- 3. role_permissions — the source of truth mapping tenant_role → permission.
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role        public.tenant_role     NOT NULL,
  permission  public.app_permission  NOT NULL,
  created_at  timestamptz            NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.role_permissions IS
  'Authoritative role → permission grants. Read by the Express API and the '
  'Auth0 post-login Action; mirrored into Auth0 native RBAC by the sync script.';

-- Uniqueness guard so the seed (and re-seeds) are idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_role_permission_key'
  ) THEN
    ALTER TABLE public.role_permissions
      ADD CONSTRAINT role_permissions_role_permission_key UNIQUE (role, permission);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS role_permissions_role_idx
  ON public.role_permissions (role);

-- 4. has_permission(_perm) — true when the caller's JWT role grants _perm.
--    Permissions are a capability layer (global per role); tenant isolation
--    stays with current_tenant_id()/RLS. Aligns the function with the
--    role_permissions source of truth.
CREATE OR REPLACE FUNCTION public.has_permission(_perm public.app_permission)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
