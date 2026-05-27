
-- Create organisations table
CREATE TABLE public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  country text NOT NULL DEFAULT 'South Africa',
  logo_url text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- Create organisation_roles table
CREATE TABLE public.organisation_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  base_role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.organisation_roles ENABLE ROW LEVEL SECURITY;

-- Add organisation_id to existing tables
ALTER TABLE public.profiles ADD COLUMN organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.sites ADD COLUMN organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.departments ADD COLUMN organisation_id uuid REFERENCES public.organisations(id);
ALTER TABLE public.shifts ADD COLUMN organisation_id uuid REFERENCES public.organisations(id);

-- Trigger for updated_at on organisations
CREATE TRIGGER update_organisations_updated_at
  BEFORE UPDATE ON public.organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for organisations: members can read their org
CREATE POLICY "Members read own organisation"
  ON public.organisations FOR SELECT
  USING (
    id IN (SELECT organisation_id FROM public.profiles WHERE id = auth.uid())
  );

-- Admins of the org can do everything
CREATE POLICY "Admins manage own organisation"
  ON public.organisations FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND id IN (SELECT organisation_id FROM public.profiles WHERE id = auth.uid())
  );

-- Allow insert during onboarding (admin creating their org)
CREATE POLICY "Admins create organisation"
  ON public.organisations FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND auth.uid() = created_by
  );

-- RLS for organisation_roles
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
