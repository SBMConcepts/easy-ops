CREATE TABLE IF NOT EXISTS public.organizations (
  auth0_org_id text PRIMARY KEY CONSTRAINT organizations_org_id_chk CHECK (length(auth0_org_id) > 0),
  name text NOT NULL CONSTRAINT organizations_name_chk CHECK (length(name) > 0),
  slug text NOT NULL,
  plan public.org_plan NOT NULL DEFAULT 'free',
  status public.org_status NOT NULL DEFAULT 'active',
  industry text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  logo_url text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_slug_key unique (slug),
  CONSTRAINT organizations_slug_chk CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
COMMENT ON TABLE public.organizations IS 'tenant root. auth0_org_id is the tenant key for the entire schema.';
-- public.users holds the MINIMUM data needed to send/receive an invitation,
-- before the invitee accepts and sets a password. It is the invite record
-- itself (there is no separate invitations table). auth0_user_id/PII/avatar do
-- NOT live here; they belong to user_credentials + org_members once the invitee
-- enrols. role carries the tier the invitee is being granted on acceptance.
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT users_org_id_chk CHECK (length(auth0_org_id) > 0),
  full_name text NOT NULL DEFAULT '',
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email extensions.citext NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  invited_by text,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT users_org_email_key unique (auth0_org_id, email),
  CONSTRAINT users_id_org_key unique (id, auth0_org_id),
  CONSTRAINT users_token_key unique (token)
);
-- public.user_credentials is the tenant/client IDENTITY anchor: everything a
-- person carries independent of a specific org membership (login credentials +
-- personal PII). It is created when the invitee accepts and sets a password.
CREATE TABLE IF NOT EXISTS public.user_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_user_id text NOT NULL CONSTRAINT user_credentials_user_id_chk CHECK (length(auth0_user_id) > 0),
  auth0_org_id text NOT NULL CONSTRAINT user_credentials_org_id_chk CHECK (length(auth0_org_id) > 0),
  full_name text,
  first_name text,
  last_name text,
  email extensions.citext NOT NULL,
  password_hash text,
  mobile_number text,
  id_type public.identification_type,
  national_id text,
  tax_number text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  email_verified boolean NOT NULL DEFAULT false,
  status public.credential_status NOT NULL DEFAULT 'active',
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_credentials_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT user_credentials_auth0_user_id_key unique (auth0_user_id),
  CONSTRAINT user_credentials_user_org_key unique (auth0_user_id, auth0_org_id),
  CONSTRAINT user_credentials_id_type_chk CHECK (
    (
      national_id IS NULL
      AND id_type IS NULL
    )
    OR (
      national_id IS NOT NULL
      AND id_type IS NOT NULL
    )
  )
);
CREATE TABLE IF NOT EXISTS public.org_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT org_departments_org_id_chk CHECK (length(auth0_org_id) > 0),
  department_name text NOT NULL CONSTRAINT org_departments_name_chk CHECK (length(btrim(department_name)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_departments_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT org_departments_id_org_key unique (id, auth0_org_id),
  CONSTRAINT org_departments_name_key unique (auth0_org_id, department_name)
);
CREATE TABLE IF NOT EXISTS public.org_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT org_sites_org_id_chk CHECK (length(auth0_org_id) > 0),
  department_id uuid NOT NULL,
  site_name text NOT NULL CONSTRAINT org_sites_name_chk CHECK (length(btrim(site_name)) > 0),
  address text NOT NULL DEFAULT '',
  latitude double precision NOT NULL CONSTRAINT org_sites_lat_chk CHECK (
    latitude between -90 AND 90
  ),
  longitude double precision NOT NULL CONSTRAINT org_sites_lng_chk CHECK (
    longitude between -180 AND 180
  ),
  geo_radius_m numeric(10, 2) NOT NULL DEFAULT 100 CONSTRAINT org_sites_radius_chk CHECK (geo_radius_m > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_sites_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT org_sites_department_fkey foreign key (department_id, auth0_org_id) REFERENCES public.org_departments (id, auth0_org_id) ON DELETE restrict,
  CONSTRAINT org_sites_id_org_key unique (id, auth0_org_id),
  CONSTRAINT org_sites_name_key unique (auth0_org_id, site_name)
);
CREATE TABLE IF NOT EXISTS public.org_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT org_roles_org_id_chk CHECK (length(auth0_org_id) > 0),
  name text NOT NULL CONSTRAINT org_roles_name_chk CHECK (length(btrim(name)) > 0),
  base_role public.org_role,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_roles_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT org_roles_id_org_key unique (id, auth0_org_id),
  CONSTRAINT org_roles_name_key unique (auth0_org_id, name)
);
CREATE TABLE IF NOT EXISTS public.org_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT org_shifts_org_id_chk CHECK (length(auth0_org_id) > 0),
  shift_name text NOT NULL CONSTRAINT org_shifts_name_chk CHECK (length(btrim(shift_name)) > 0),
  start_time time NOT NULL,
  end_time time NOT NULL,
  grace_period_minutes integer NOT NULL DEFAULT 0 CONSTRAINT org_shifts_grace_chk CHECK (
    grace_period_minutes between 0 AND 240
  ),
  weekly_hours numeric(6, 2) CONSTRAINT org_shifts_weekly_hours_chk CHECK (
    weekly_hours IS NULL
    OR weekly_hours between 0 AND 168
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_shifts_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT org_shifts_id_org_key unique (id, auth0_org_id),
  CONSTRAINT org_shifts_name_key unique (auth0_org_id, shift_name),
  CONSTRAINT org_shifts_time_chk CHECK (start_time <> end_time)
);
CREATE TABLE IF NOT EXISTS public.org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT org_members_org_id_chk CHECK (length(auth0_org_id) > 0),
  auth0_user_id text NOT NULL CONSTRAINT org_members_user_id_chk CHECK (length(auth0_user_id) > 0),
  full_name text NOT NULL DEFAULT '',
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email extensions.citext NOT NULL DEFAULT '',
  avatar_url text,
  role public.org_role NOT NULL DEFAULT 'member',
  status public.member_status NOT NULL DEFAULT 'active',
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb CONSTRAINT org_members_permissions_chk CHECK (jsonb_typeof(permissions) = 'array'),
  leave_balances jsonb NOT NULL DEFAULT '[]'::jsonb CONSTRAINT org_members_leave_balances_chk CHECK (jsonb_typeof(leave_balances) = 'array'),
  department_id uuid,
  site_id uuid,
  job_role_id uuid,
  shift_id uuid,
  manager_id text CONSTRAINT org_members_manager_id_chk CHECK (length(btrim(manager_id)) > 0),
  employee_code text,
  employment_type public.employment_type,
  hourly_rate numeric(12, 2) CONSTRAINT org_members_rate_chk CHECK (
    hourly_rate IS NULL
    OR hourly_rate >= 0
  ),
  tax_number text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_members_auth0_user_id_key unique (auth0_user_id),
  CONSTRAINT org_members_user_fkey foreign key (auth0_user_id, auth0_org_id) REFERENCES public.user_credentials (auth0_user_id, auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT org_members_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT org_members_department_fkey foreign key (department_id, auth0_org_id) REFERENCES public.org_departments (id, auth0_org_id) ON DELETE no action,
  CONSTRAINT org_members_site_fkey foreign key (site_id, auth0_org_id) REFERENCES public.org_sites (id, auth0_org_id) ON DELETE no action,
  CONSTRAINT org_members_job_role_fkey foreign key (job_role_id, auth0_org_id) REFERENCES public.org_roles (id, auth0_org_id) ON DELETE no action,
  CONSTRAINT org_members_shift_fkey foreign key (shift_id, auth0_org_id) REFERENCES public.org_shifts (id, auth0_org_id) ON DELETE no action,
  CONSTRAINT org_members_id_org_key unique (id, auth0_org_id),
  CONSTRAINT org_members_user_org_key unique (auth0_user_id, auth0_org_id),
  CONSTRAINT org_members_manager_fkey foreign key (manager_id, auth0_org_id) REFERENCES public.org_members (auth0_user_id, auth0_org_id) ON DELETE no action,
  CONSTRAINT org_members_no_self_manage CHECK (manager_id is distinct from auth0_user_id)
);
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT subscriptions_org_id_chk CHECK (length(auth0_org_id) > 0),
  plan public.org_plan NOT NULL,
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE
);
CREATE unique index IF NOT EXISTS subscriptions_one_live_per_org ON public.subscriptions (auth0_org_id)
WHERE status in ('trialing', 'active', 'past_due');
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT audit_logs_org_id_chk CHECK (length(auth0_org_id) > 0),
  auth0_user_id text NOT NULL CONSTRAINT audit_logs_user_id_chk CHECK (length(auth0_user_id) > 0),
  action text NOT NULL CONSTRAINT audit_logs_action_chk CHECK (length(btrim(action)) > 0),
  resource_type text,
  resource_id text,
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT audit_logs_actor_fkey foreign key (auth0_user_id, auth0_org_id) REFERENCES public.user_credentials (auth0_user_id, auth0_org_id) ON DELETE restrict
);
CREATE TABLE IF NOT EXISTS public.org_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT org_attendance_org_id_chk CHECK (length(auth0_org_id) > 0),
  auth0_user_id text NOT NULL CONSTRAINT org_attendance_user_id_chk CHECK (length(auth0_user_id) > 0),
  date date NOT NULL,
  method public.attendance_method NOT NULL,
  hours_worked numeric(6, 2) NOT NULL DEFAULT 0 CONSTRAINT org_attendance_hours_chk CHECK (
    hours_worked between 0 AND 24
  ),
  overtime numeric(6, 2) NOT NULL DEFAULT 0 CONSTRAINT org_attendance_overtime_chk CHECK (
    overtime between 0 AND 24
  ),
  department_id uuid,
  site_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_attendance_member_fkey foreign key (auth0_org_id, auth0_user_id) REFERENCES public.org_members (auth0_org_id, auth0_user_id) ON DELETE CASCADE,
  CONSTRAINT org_attendance_department_fkey foreign key (department_id, auth0_org_id) REFERENCES public.org_departments (id, auth0_org_id) ON DELETE no action,
  CONSTRAINT org_attendance_site_fkey foreign key (site_id, auth0_org_id) REFERENCES public.org_sites (id, auth0_org_id) ON DELETE no action,
  CONSTRAINT org_attendance_day_key unique (auth0_org_id, auth0_user_id, date)
);

CREATE TABLE IF NOT EXISTS public.org_leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT org_leave_balances_org_id_chk CHECK (length(auth0_org_id) > 0),
  auth0_user_id text NOT NULL CONSTRAINT org_leave_balances_user_id_chk CHECK (length(auth0_user_id) > 0),
  leave_type public.leave_type NOT NULL,
  balance_days numeric(6, 2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_leave_balances_member_fkey foreign key (auth0_org_id, auth0_user_id) REFERENCES public.org_members (auth0_org_id, auth0_user_id) ON DELETE CASCADE,
  CONSTRAINT org_leave_balances_key unique (auth0_org_id, auth0_user_id, leave_type)
);

CREATE TABLE IF NOT EXISTS public.labour_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT labour_forecasts_org_id_chk CHECK (length(auth0_org_id) > 0),
  site_id uuid,
  forecast_date date NOT NULL,
  horizon_days integer NOT NULL DEFAULT 7 CONSTRAINT labour_forecasts_horizon_chk CHECK (
    horizon_days between 1 AND 365
  ),
  predicted_required_staff integer CONSTRAINT labour_forecasts_staff_chk CHECK (
    predicted_required_staff IS NULL
    OR predicted_required_staff >= 0
  ),
  predicted_hours numeric(10, 2) CONSTRAINT labour_forecasts_hours_chk CHECK (
    predicted_hours IS NULL
    OR predicted_hours >= 0
  ),
  demand_score numeric(5, 2),
  confidence numeric(5, 4) CONSTRAINT labour_forecasts_confidence_chk CHECK (
    confidence IS NULL
    OR confidence between 0 AND 1
  ),
  model text,
  reasoning text,
  input_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT labour_forecasts_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT labour_forecasts_site_fkey foreign key (site_id, auth0_org_id) REFERENCES public.org_sites (id, auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT labour_forecasts_generator_fkey foreign key (generated_by, auth0_org_id) REFERENCES public.org_members (auth0_user_id, auth0_org_id) ON DELETE no action,
  CONSTRAINT labour_forecasts_id_org_key unique (id, auth0_org_id)
);

CREATE TABLE IF NOT EXISTS public.labour_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT labour_alerts_org_id_chk CHECK (length(auth0_org_id) > 0),
  forecast_id uuid,
  site_id uuid,
  auth0_user_id text CONSTRAINT labour_alerts_user_id_chk CHECK (length(auth0_user_id) > 0),
  alert_type public.forecast_alert_type NOT NULL,
  severity public.forecast_alert_severity NOT NULL DEFAULT 'medium',
  status public.forecast_alert_status NOT NULL DEFAULT 'open',
  target_date date,
  title text NOT NULL CONSTRAINT labour_alerts_title_chk CHECK (length(btrim(title)) > 0),
  detail text,
  recommended_action text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_by text,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT labour_alerts_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT labour_alerts_forecast_fkey foreign key (forecast_id, auth0_org_id) REFERENCES public.labour_forecasts (id, auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT labour_alerts_site_fkey foreign key (site_id, auth0_org_id) REFERENCES public.org_sites (id, auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT labour_alerts_member_fkey foreign key (auth0_user_id, auth0_org_id) REFERENCES public.org_members (auth0_user_id, auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT labour_alerts_ack_fkey foreign key (acknowledged_by, auth0_org_id) REFERENCES public.org_members (auth0_user_id, auth0_org_id) ON DELETE no action,
  CONSTRAINT labour_alerts_ack_chk CHECK (
    status <> 'acknowledged'
    OR acknowledged_at IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.payroll_export_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT payroll_export_runs_org_id_chk CHECK (length(auth0_org_id) > 0),
  period_start date NOT NULL,
  period_end date NOT NULL,
  format public.payroll_export_format NOT NULL DEFAULT 'csv',
  employee_count integer NOT NULL DEFAULT 0 CONSTRAINT payroll_export_runs_count_chk CHECK (employee_count >= 0),
  gross_total numeric(14, 2) NOT NULL DEFAULT 0 CONSTRAINT payroll_export_runs_gross_chk CHECK (gross_total >= 0),
  paye_total numeric(14, 2) NOT NULL DEFAULT 0 CONSTRAINT payroll_export_runs_paye_chk CHECK (paye_total >= 0),
  uif_total numeric(14, 2) NOT NULL DEFAULT 0 CONSTRAINT payroll_export_runs_uif_chk CHECK (uif_total >= 0),
  net_total numeric(14, 2) NOT NULL DEFAULT 0 CONSTRAINT payroll_export_runs_net_chk CHECK (net_total >= 0),
  generated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payroll_export_runs_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT payroll_export_runs_generator_fkey foreign key (generated_by, auth0_org_id) REFERENCES public.org_members (auth0_user_id, auth0_org_id) ON DELETE no action,
  CONSTRAINT payroll_export_runs_period_chk CHECK (period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT support_tickets_org_id_chk CHECK (length(auth0_org_id) > 0),
  subject text NOT NULL CONSTRAINT support_tickets_subject_chk CHECK (length(btrim(subject)) > 0),
  description text,
  category public.support_ticket_category NOT NULL DEFAULT 'general',
  priority public.support_ticket_priority NOT NULL DEFAULT 'medium',
  status public.support_ticket_status NOT NULL DEFAULT 'open',
  plan_at_creation public.org_plan,
  sla_response_due timestamptz,
  sla_resolution_due timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_by text,
  assigned_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_tickets_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT support_tickets_creator_fkey foreign key (created_by, auth0_org_id) REFERENCES public.org_members (auth0_user_id, auth0_org_id) ON DELETE no action,
  CONSTRAINT support_tickets_id_org_key unique (id, auth0_org_id),
  CONSTRAINT support_tickets_closed_chk CHECK (
    status <> 'closed'
    OR closed_at IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  auth0_org_id text NOT NULL CONSTRAINT support_messages_org_id_chk CHECK (length(auth0_org_id) > 0),
  author_id text,
  author_role public.support_message_author NOT NULL DEFAULT 'customer',
  body text NOT NULL CONSTRAINT support_messages_body_chk CHECK (length(btrim(body)) > 0),
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_messages_ticket_fkey foreign key (ticket_id, auth0_org_id) REFERENCES public.support_tickets (id, auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT support_messages_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.csm_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT csm_assignments_org_id_chk CHECK (length(auth0_org_id) > 0),
  csm_name text NOT NULL CONSTRAINT csm_assignments_name_chk CHECK (length(btrim(csm_name)) > 0),
  csm_email extensions.citext NOT NULL,
  csm_phone text,
  csm_title text,
  calendar_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT csm_assignments_org_key unique (auth0_org_id),
  CONSTRAINT csm_assignments_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.safety_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT safety_templates_org_id_chk CHECK (length(auth0_org_id) > 0),
  name text NOT NULL CONSTRAINT safety_templates_name_chk CHECK (length(name) > 0),
  description text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb CONSTRAINT safety_templates_items_chk CHECK (jsonb_typeof(items) = 'array'),
  required_at_shift_start boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT safety_templates_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT safety_templates_creator_fkey foreign key (created_by, auth0_org_id) REFERENCES public.org_members (auth0_user_id, auth0_org_id) ON DELETE no action,
  CONSTRAINT safety_templates_id_org_key unique (id, auth0_org_id),
  CONSTRAINT safety_templates_name_key unique (auth0_org_id, name)
);
CREATE TABLE IF NOT EXISTS public.safety_checklist_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT safety_responses_org_id_chk CHECK (length(auth0_org_id) > 0),
  template_id uuid NOT NULL,
  auth0_user_id text NOT NULL CONSTRAINT safety_responses_user_id_chk CHECK (length(auth0_user_id) > 0),
  shift_id uuid,
  site_id uuid,
  responses jsonb NOT NULL DEFAULT '[]'::jsonb CONSTRAINT safety_responses_payload_chk CHECK (jsonb_typeof(responses) = 'array'),
  passed boolean NOT NULL DEFAULT true,
  notes text,
  signature_data text NOT NULL CONSTRAINT safety_responses_signature_chk CHECK (length(signature_data) > 0),
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT safety_responses_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT safety_responses_template_fkey foreign key (template_id, auth0_org_id) REFERENCES public.safety_checklist_templates (id, auth0_org_id) ON DELETE restrict,
  CONSTRAINT safety_responses_member_fkey foreign key (auth0_user_id, auth0_org_id) REFERENCES public.org_members (auth0_user_id, auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT safety_responses_shift_fkey foreign key (shift_id, auth0_org_id) REFERENCES public.org_shifts (id, auth0_org_id) ON DELETE no action,
  CONSTRAINT safety_responses_site_fkey foreign key (site_id, auth0_org_id) REFERENCES public.org_sites (id, auth0_org_id) ON DELETE no action
);

CREATE TABLE IF NOT EXISTS public.incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_org_id text NOT NULL CONSTRAINT incident_reports_org_id_chk CHECK (length(auth0_org_id) > 0),
  reporter_id text NOT NULL CONSTRAINT incident_reports_reporter_chk CHECK (length(reporter_id) > 0),
  site_id uuid,
  department_id uuid,
  incident_type public.incident_type NOT NULL,
  severity public.incident_severity NOT NULL,
  status public.incident_status NOT NULL DEFAULT 'open',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL CONSTRAINT incident_reports_description_chk CHECK (length(btrim(description)) > 0),
  actions_taken text,
  witnesses text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb CONSTRAINT incident_reports_photos_chk CHECK (jsonb_typeof(photos) = 'array'),
  reporter_signature text NOT NULL CONSTRAINT incident_reports_signature_chk CHECK (length(reporter_signature) > 0),
  reporter_signed_at timestamptz NOT NULL DEFAULT now(),
  manager_user_id text,
  manager_signature text,
  manager_signed_at timestamptz,
  manager_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT incident_reports_org_fkey foreign key (auth0_org_id) REFERENCES public.organizations (auth0_org_id) ON DELETE CASCADE,
  CONSTRAINT incident_reports_reporter_fkey foreign key (reporter_id, auth0_org_id) REFERENCES public.org_members (auth0_user_id, auth0_org_id) ON DELETE restrict,
  CONSTRAINT incident_reports_manager_fkey foreign key (manager_user_id, auth0_org_id) REFERENCES public.org_members (auth0_user_id, auth0_org_id) ON DELETE no action,
  CONSTRAINT incident_reports_site_fkey foreign key (site_id, auth0_org_id) REFERENCES public.org_sites (id, auth0_org_id) ON DELETE no action,
  CONSTRAINT incident_reports_department_fkey foreign key (department_id, auth0_org_id) REFERENCES public.org_departments (id, auth0_org_id) ON DELETE no action,
  CONSTRAINT incident_reports_manager_sign_chk CHECK (
    (
      manager_signature IS NULL
      AND manager_signed_at IS NULL
    )
    OR (
      manager_signature IS NOT NULL
      AND manager_signed_at IS NOT NULL
      AND manager_user_id IS NOT NULL
    )
  )
);
CREATE index IF NOT EXISTS idx_users_org ON public.users (auth0_org_id);
CREATE index IF NOT EXISTS idx_users_org_email ON public.users (auth0_org_id, email);
CREATE index IF NOT EXISTS idx_user_credentials_org ON public.user_credentials (auth0_org_id);
CREATE index IF NOT EXISTS idx_departments_org ON public.org_departments (auth0_org_id);
CREATE index IF NOT EXISTS idx_sites_org ON public.org_sites (auth0_org_id);
CREATE index IF NOT EXISTS idx_sites_department ON public.org_sites (department_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_roles_org ON public.org_roles (auth0_org_id);
CREATE index IF NOT EXISTS idx_shifts_org ON public.org_shifts (auth0_org_id);
CREATE index IF NOT EXISTS idx_members_org ON public.org_members (auth0_org_id);
CREATE index IF NOT EXISTS idx_members_org_status ON public.org_members (auth0_org_id, status);
CREATE index IF NOT EXISTS idx_members_department ON public.org_members (department_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_members_site ON public.org_members (site_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_members_shift ON public.org_members (shift_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_members_job_role ON public.org_members (job_role_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_members_manager ON public.org_members (manager_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_subscriptions_org ON public.subscriptions (auth0_org_id);
CREATE index IF NOT EXISTS idx_audit_org_created ON public.audit_logs (auth0_org_id, created_at desc);
CREATE index IF NOT EXISTS idx_audit_actor ON public.audit_logs (auth0_user_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_audit_resource ON public.audit_logs (auth0_org_id, resource_type, resource_id);
CREATE index IF NOT EXISTS idx_audit_created_brin ON public.audit_logs USING brin (created_at) WITH (pages_per_range = 32);
CREATE index IF NOT EXISTS idx_attendance_org_date ON public.org_attendance (auth0_org_id, date desc);
CREATE index IF NOT EXISTS idx_attendance_member_date ON public.org_attendance (auth0_org_id, auth0_user_id, date desc);
CREATE index IF NOT EXISTS idx_attendance_site ON public.org_attendance (site_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_attendance_department ON public.org_attendance (department_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_attendance_date_brin ON public.org_attendance USING brin (date) WITH (pages_per_range = 32);
CREATE index IF NOT EXISTS idx_leave_balances_member ON public.org_leave_balances (auth0_org_id, auth0_user_id);
CREATE index IF NOT EXISTS idx_forecasts_org_date ON public.labour_forecasts (auth0_org_id, forecast_date desc);
CREATE index IF NOT EXISTS idx_forecasts_site ON public.labour_forecasts (site_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_forecasts_generator ON public.labour_forecasts (generated_by, auth0_org_id);
CREATE index IF NOT EXISTS idx_alerts_org_status ON public.labour_alerts (auth0_org_id, status);
CREATE index IF NOT EXISTS idx_alerts_org_open ON public.labour_alerts (auth0_org_id, created_at desc)
WHERE status = 'open';
CREATE index IF NOT EXISTS idx_alerts_member ON public.labour_alerts (auth0_org_id, auth0_user_id);
CREATE index IF NOT EXISTS idx_alerts_forecast ON public.labour_alerts (forecast_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_alerts_site ON public.labour_alerts (site_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_alerts_ack ON public.labour_alerts (acknowledged_by, auth0_org_id);
CREATE index IF NOT EXISTS idx_payroll_org_period ON public.payroll_export_runs (auth0_org_id, period_start desc);
CREATE index IF NOT EXISTS idx_payroll_generator ON public.payroll_export_runs (generated_by, auth0_org_id);
CREATE index IF NOT EXISTS idx_tickets_org_status ON public.support_tickets (auth0_org_id, status);
CREATE index IF NOT EXISTS idx_tickets_org_created ON public.support_tickets (auth0_org_id, created_at desc);
CREATE index IF NOT EXISTS idx_tickets_creator ON public.support_tickets (created_by, auth0_org_id);
CREATE index IF NOT EXISTS idx_tickets_sla_open ON public.support_tickets (sla_resolution_due)
WHERE status not in ('resolved', 'closed');
CREATE index IF NOT EXISTS idx_messages_ticket ON public.support_messages (ticket_id, created_at);
CREATE index IF NOT EXISTS idx_messages_org ON public.support_messages (auth0_org_id);
CREATE index IF NOT EXISTS idx_safety_templates_org ON public.safety_checklist_templates (auth0_org_id);
CREATE index IF NOT EXISTS idx_safety_templates_active ON public.safety_checklist_templates (auth0_org_id)
WHERE active;
CREATE index IF NOT EXISTS idx_safety_templates_creator ON public.safety_checklist_templates (created_by, auth0_org_id);
CREATE index IF NOT EXISTS idx_safety_responses_org ON public.safety_checklist_responses (auth0_org_id, signed_at desc);
CREATE index IF NOT EXISTS idx_safety_responses_member ON public.safety_checklist_responses (auth0_org_id, auth0_user_id);
CREATE index IF NOT EXISTS idx_safety_responses_template ON public.safety_checklist_responses (template_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_safety_responses_shift ON public.safety_checklist_responses (shift_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_safety_responses_site ON public.safety_checklist_responses (site_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_incidents_org_occurred ON public.incident_reports (auth0_org_id, occurred_at desc);
CREATE index IF NOT EXISTS idx_incidents_org_status ON public.incident_reports (auth0_org_id, status);
CREATE index IF NOT EXISTS idx_incidents_reporter ON public.incident_reports (auth0_org_id, reporter_id);
CREATE index IF NOT EXISTS idx_incidents_manager ON public.incident_reports (manager_user_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_incidents_site ON public.incident_reports (site_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_incidents_department ON public.incident_reports (department_id, auth0_org_id);
CREATE index IF NOT EXISTS idx_organizations_metadata ON public.organizations USING gin (metadata);
CREATE index IF NOT EXISTS idx_audit_diff ON public.audit_logs USING gin (diff);
CREATE index IF NOT EXISTS idx_safety_templates_items ON public.safety_checklist_templates USING gin (items);
CREATE index IF NOT EXISTS idx_incidents_photos ON public.incident_reports USING gin (photos);
CREATE index IF NOT EXISTS idx_forecasts_input ON public.labour_forecasts USING gin (input_summary);
