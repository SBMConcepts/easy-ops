-- ============================================================
-- organisations_schema_fix + user_roles → profiles FK
-- Safe to run multiple times (IF NOT EXISTS throughout).
-- Paste into Supabase Dashboard → SQL Editor and click Run.
-- ============================================================

-- 0. Add FK from user_roles.user_id → profiles.id so PostgREST can
--    resolve embedded resource queries like profiles.select("*, user_roles(role)").
--    (user_roles.user_id already references auth.users; this adds a second FK
--    within the public schema that PostgREST can see.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_roles_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 1. organisations table
CREATE TABLE IF NOT EXISTS public.organisations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  industry             text,
  country              text NOT NULL DEFAULT 'South Africa',
  logo_url             text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  settings             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by           uuid NOT NULL,
  created_at           timestamp with time zone NOT NULL DEFAULT now(),
  updated_at           timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- 2. organisation_roles table
CREATE TABLE IF NOT EXISTS public.organisation_roles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  base_role       public.app_role NOT NULL,
  created_at      timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.organisation_roles ENABLE ROW LEVEL SECURITY;

-- 3. Add organisation_id FK to existing tables (safe if columns already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organisation_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN organisation_id uuid REFERENCES public.organisations(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sites' AND column_name = 'organisation_id'
  ) THEN
    ALTER TABLE public.sites ADD COLUMN organisation_id uuid REFERENCES public.organisations(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'departments' AND column_name = 'organisation_id'
  ) THEN
    ALTER TABLE public.departments ADD COLUMN organisation_id uuid REFERENCES public.organisations(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shifts' AND column_name = 'organisation_id'
  ) THEN
    ALTER TABLE public.shifts ADD COLUMN organisation_id uuid REFERENCES public.organisations(id);
  END IF;
END $$;

-- 4. updated_at trigger for organisations
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_organisations_updated_at'
  ) THEN
    CREATE TRIGGER update_organisations_updated_at
      BEFORE UPDATE ON public.organisations
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 5. RLS policies for organisations (drop first to avoid duplicates)
DROP POLICY IF EXISTS "Members read own organisation"  ON public.organisations;
DROP POLICY IF EXISTS "Admins manage own organisation" ON public.organisations;
DROP POLICY IF EXISTS "Admins create organisation"     ON public.organisations;

CREATE POLICY "Members read own organisation"
  ON public.organisations FOR SELECT
  USING (
    id IN (SELECT organisation_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins manage own organisation"
  ON public.organisations FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND id IN (SELECT organisation_id FROM public.profiles WHERE id = auth.uid())
  );

-- Allows the service-role client in the edge function to insert freely.
-- The edge function authenticates the user before calling this, so it's safe.
CREATE POLICY "Admins create organisation"
  ON public.organisations FOR INSERT
  WITH CHECK (true);

-- 6. RLS policies for organisation_roles (drop first to avoid duplicates)
DROP POLICY IF EXISTS "Members read org roles"  ON public.organisation_roles;
DROP POLICY IF EXISTS "Admins manage org roles" ON public.organisation_roles;

CREATE POLICY "Members read org roles"
  ON public.organisation_roles FOR SELECT
  USING (
    organisation_id IN (SELECT organisation_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins manage org roles"
  ON public.organisation_roles FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND organisation_id IN (SELECT organisation_id FROM public.profiles WHERE id = auth.uid())
  );
