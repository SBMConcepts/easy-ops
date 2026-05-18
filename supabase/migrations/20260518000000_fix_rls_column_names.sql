-- Fix RLS helper functions and policies after column renames:
--   user_roles.role       → user_roles.organisation_roles
--   profiles.department   → profiles.department_id  (UUID FK)
--   profiles.site         → profiles.profile_site_id (UUID FK)

-- ── 1. has_role() ────────────────────────────────────────────────────────────
-- Used by virtually every RLS policy. Was broken because it queried
-- user_roles.role which no longer exists.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND organisation_roles = _role
  )
$$;

-- ── 2. get_user_role() ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organisation_roles FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- ── 3. get_user_department() — return type TEXT → UUID ───────────────────────
-- PostgreSQL requires DROP + CREATE when the return type changes.
DROP FUNCTION IF EXISTS public.get_user_department(UUID);

CREATE FUNCTION public.get_user_department(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles
  WHERE id = _user_id
$$;

-- ── 4. get_user_site() — return type TEXT → UUID ─────────────────────────────
DROP FUNCTION IF EXISTS public.get_user_site(UUID);

CREATE FUNCTION public.get_user_site(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT profile_site_id FROM public.profiles
  WHERE id = _user_id
$$;

-- ── 5. Recreate RLS policies that compared against old column names ───────────

-- profiles: Managers read department profiles
DROP POLICY IF EXISTS "Managers read department profiles" ON public.profiles;
CREATE POLICY "Managers read department profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'manager')
    AND department_id = public.get_user_department(auth.uid())
  );

-- profiles: Supervisors read site profiles
DROP POLICY IF EXISTS "Supervisors read site profiles" ON public.profiles;
CREATE POLICY "Supervisors read site profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'supervisor')
    AND profile_site_id = public.get_user_site(auth.uid())
  );

-- attendance_records: Supervisors read team attendance
DROP POLICY IF EXISTS "Supervisors read team attendance" ON public.attendance_records;
CREATE POLICY "Supervisors read team attendance"
  ON public.attendance_records FOR SELECT
  USING (
    public.has_role(auth.uid(), 'supervisor')
    AND employee_id IN (
      SELECT id FROM public.profiles
      WHERE profile_site_id = public.get_user_site(auth.uid())
    )
  );
