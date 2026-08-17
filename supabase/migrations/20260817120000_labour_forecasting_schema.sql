-- Complete the data model required by predictive labour forecasting.
-- Existing auth0_org_id/auth0_user_id names remain the tenant and member keys.

DO $
$
BEGIN
    IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'attendance_status'
  ) THEN
    CREATE TYPE public.attendance_status AS ENUM
    ('present', 'absent', 'leave', 'sick_leave');
END
IF;

  IF NOT EXISTS (
    SELECT 1
FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typname = 'roster_shift_status'
  ) THEN
CREATE TYPE public.roster_shift_status AS ENUM
('scheduled', 'cancelled');
END
IF;
END
$$;

ALTER TYPE public.forecast_alert_type
ADD VALUE
IF NOT EXISTS 'staffing_shortage';
ALTER TYPE public.forecast_alert_type
ADD VALUE
IF NOT EXISTS 'understaffed_shift';
ALTER TYPE public.forecast_alert_type
ADD VALUE
IF NOT EXISTS 'burnout_risk';

ALTER TABLE public.org_attendance
  ADD COLUMN
IF NOT EXISTS status public.attendance_status NOT NULL DEFAULT 'present';

-- A dated assignment is distinct from org_shifts, which only defines a reusable
-- shift template. Forecasting consumes scheduled assignments as planned demand.
CREATE TABLE
IF NOT EXISTS public.org_roster_shifts
(
  auth0_org_id text NOT NULL CONSTRAINT org_roster_shifts_org_id_chk CHECK
(length
(auth0_org_id) > 0),
  id uuid NOT NULL DEFAULT gen_random_uuid
(),
  auth0_user_id text NOT NULL CONSTRAINT org_roster_shifts_user_id_chk CHECK
(length
(auth0_user_id) > 0),
  site_id uuid,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status public.roster_shift_status NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now
(),
  updated_at timestamptz NOT NULL DEFAULT now
(),
  CONSTRAINT org_roster_shifts_pkey PRIMARY KEY
(auth0_org_id, id),
  CONSTRAINT org_roster_shifts_id_key UNIQUE
(id),
  CONSTRAINT org_roster_shifts_member_fkey FOREIGN KEY
(auth0_org_id, auth0_user_id)
    REFERENCES public.org_members
(auth0_org_id, auth0_user_id) ON
DELETE CASCADE,
  CONSTRAINT org_roster_shifts_site_fkey FOREIGN KEY
(auth0_org_id, site_id)
    REFERENCES public.org_sites
(auth0_org_id, id) ON
DELETE
SET NULL
,
  CONSTRAINT org_roster_shifts_time_chk CHECK
(end_at > start_at),
  CONSTRAINT org_roster_shifts_member_start_key UNIQUE
(auth0_org_id, auth0_user_id, start_at)
);

CREATE INDEX
IF NOT EXISTS idx_org_roster_shifts_org_start
  ON public.org_roster_shifts
(auth0_org_id, start_at);
CREATE INDEX
IF NOT EXISTS idx_org_roster_shifts_org_site_start
  ON public.org_roster_shifts
(auth0_org_id, site_id, start_at);
CREATE INDEX
IF NOT EXISTS idx_org_roster_shifts_org_member_start
  ON public.org_roster_shifts
(auth0_org_id, auth0_user_id, start_at);

-- All-sites forecasts and organization-level alerts intentionally have no site
-- or member target. Earlier schema drift made these fields non-null remotely.
ALTER TABLE public.labour_forecasts ALTER COLUMN site_id DROP NOT NULL;
ALTER TABLE public.labour_alerts ALTER COLUMN site_id DROP NOT NULL;
ALTER TABLE public.labour_alerts ALTER COLUMN auth0_user_id DROP NOT NULL;
ALTER TABLE public.labour_alerts ALTER COLUMN forecast_id DROP NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_roster_shifts TO authenticated;

ALTER TABLE public.org_roster_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY
IF EXISTS "roster_shifts_select" ON public.org_roster_shifts;
CREATE POLICY "roster_shifts_select" ON public.org_roster_shifts
  FOR
SELECT TO authenticated
USING
(auth0_org_id = auth0.current_org_id
());

DROP POLICY
IF EXISTS "roster_shifts_write" ON public.org_roster_shifts;
CREATE POLICY "roster_shifts_write" ON public.org_roster_shifts
  FOR ALL TO authenticated
  USING
(
    auth0_org_id = auth0.current_org_id
()
    AND auth0.is_org_manager
()
  )
  WITH CHECK
(
    auth0_org_id = auth0.current_org_id
()
    AND auth0.is_org_manager
()
  );

DROP TRIGGER IF EXISTS trg_org_roster_shifts_updated_at
ON public.org_roster_shifts;
CREATE TRIGGER trg_org_roster_shifts_updated_at
  BEFORE
UPDATE ON public.org_roster_shifts
  FOR EACH ROW
EXECUTE FUNCTION
public.set_updated_at
();