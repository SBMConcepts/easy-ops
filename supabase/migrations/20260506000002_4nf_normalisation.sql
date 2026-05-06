-- ============================================================
-- 4NF / 3NF normalisation
--
-- Problems in current schema:
--   1. profiles.department TEXT  — stores a name string.
--      Violates 3NF: department attributes (name, site_id…) live
--      in the departments table; profiles should hold a FK, not a copy.
--   2. profiles.site TEXT — same issue against the sites table.
--   3. shifts table has a single site_id column. If a shift were to
--      apply to multiple sites independently of its time definition,
--      that would create a multi-valued dependency (4NF violation).
--      A shift_sites junction table is added to future-proof this.
--
-- Strategy: add normalised FK columns alongside the legacy text columns
-- so existing frontend code continues to work while you migrate.
-- The text columns can be dropped in a later migration once the UI is
-- updated to use the new FKs.
-- ============================================================

-- 1. Add department_id FK to profiles (3NF fix)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'department_id'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Add site_id FK to profiles (3NF fix)
--    Named profile_site_id to avoid ambiguity — sites.id is the target.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'profile_site_id'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN profile_site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. shift_sites junction table (4NF fix)
--    A shift's time definition is independent from which sites it covers.
--    Instead of shifts.site_id (one-to-one), this table allows a shift
--    to cover many sites without duplicating the shift record.
CREATE TABLE IF NOT EXISTS public.shift_sites (
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  site_id  uuid NOT NULL REFERENCES public.sites(id)  ON DELETE CASCADE,
  PRIMARY KEY (shift_id, site_id)
);

ALTER TABLE public.shift_sites ENABLE ROW LEVEL SECURITY;

-- Backfill shift_sites from the existing shifts.site_id column
-- so existing data is not lost. Skips nulls and duplicate pairs.
INSERT INTO public.shift_sites (shift_id, site_id)
SELECT s.id, s.site_id
FROM   public.shifts s
WHERE  s.site_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. RLS for shift_sites — org members can read; admins can manage
DROP POLICY IF EXISTS "Members read shift_sites" ON public.shift_sites;
CREATE POLICY "Members read shift_sites"
  ON public.shift_sites FOR SELECT
  USING (
    site_id IN (
      SELECT id FROM public.sites
      WHERE organisation_id IN (
        SELECT organisation_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admins manage shift_sites" ON public.shift_sites;
CREATE POLICY "Admins manage shift_sites"
  ON public.shift_sites FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND site_id IN (
      SELECT id FROM public.sites
      WHERE organisation_id IN (
        SELECT organisation_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- 5. Indexes for FK lookups (performance)
CREATE INDEX IF NOT EXISTS idx_profiles_department_id   ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_site_id ON public.profiles(profile_site_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organisation_id ON public.profiles(organisation_id);
CREATE INDEX IF NOT EXISTS idx_shift_sites_site_id      ON public.shift_sites(site_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id   ON public.attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_site_date     ON public.attendance_records(site_id, date);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id       ON public.user_roles(user_id);
