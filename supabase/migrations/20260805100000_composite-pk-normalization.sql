-- ============================================================================
-- Composite PK normalization (3NF / multi-tenant hardening)
--
-- Every tenant table moves from PRIMARY KEY(id) to PRIMARY KEY(auth0_org_id, id)
-- (org-id leading), with a standalone UNIQUE(id) kept as a formal global-
-- uniqueness guarantee. This physically prevents an org-filter-less
-- `WHERE id = $1` bug from ever crossing tenants, and the PK's backing index
-- doubles as an org-scoped lookup index. All composite FKs are recreated
-- org-id-first for the same reason (Postgres matches FKs by column *set*, not
-- literal order, so this is a consistency/index-shape change, not a
-- correctness fix on its own).
--
-- This migration takes brief ACCESS EXCLUSIVE locks per table (consistent with
-- this repo's existing single-transaction migration style; these are small
-- operational tables). For a genuinely hot production table, pre-build the
-- replacement unique index with `CREATE UNIQUE INDEX CONCURRENTLY` out-of-band
-- and swap the PK ADD step below for `... PRIMARY KEY USING INDEX <name>`.
-- ============================================================================

-- ---- 1. Swap PRIMARY KEY(id) -> PRIMARY KEY(auth0_org_id, id) + standalone UNIQUE(id) ----
-- organizations is excluded: it is already keyed on auth0_org_id itself, not a
-- separate uuid id, so there is nothing to reshape there.
--
-- NOTE ON DRIFT: several of these tables pre-dated migration 20260801000002, so
-- its `CREATE TABLE IF NOT EXISTS` blocks were no-ops for them -- the composite
-- FK definitions written in that file's text were NEVER actually applied. The
-- live FKs are plain single-column ones under Postgres's auto-generated names
-- (e.g. `org_sites_department_id_fkey`), not the names this migration assumed.
-- Rather than guess live names, `DROP ... CASCADE` removes whatever FK really
-- exists (any name, any table) once its supporting PK index is dropped; step 4
-- below then recreates every relationship fresh, tenant-safe and idempotent.
DO $pk$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'users', 'user_credentials', 'org_departments', 'org_sites', 'org_roles', 'org_shifts',
    'org_members', 'org_attendance', 'org_leave_balances', 'subscriptions', 'audit_logs',
    'labour_forecasts', 'labour_alerts', 'payroll_export_runs', 'support_tickets',
    'support_messages', 'csm_assignments', 'safety_checklist_templates',
    'safety_checklist_responses', 'incident_reports'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I_pkey CASCADE', v_table, v_table);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I_id_key', v_table, v_table);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I_pkey PRIMARY KEY (auth0_org_id, id)',
      v_table, v_table
    );
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I_id_key UNIQUE (id)', v_table, v_table);
  END LOOP;
END
$pk$;

-- ---- 2. Drop the old (id, auth0_org_id)-style uniques, whatever they're actually named ----
-- Discovered dynamically by column set rather than a guessed name, for the same
-- drift reason as step 1 (CASCADE clears any FK still hanging off one of these).
DO $uq$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass::text AS tbl, c.conname
    FROM pg_constraint c
    WHERE c.contype = 'u'
      AND c.conrelid::regclass::text = ANY (ARRAY[
        'public.users', 'public.org_departments', 'public.org_sites', 'public.org_roles',
        'public.org_shifts', 'public.org_members', 'public.support_tickets',
        'public.labour_forecasts', 'public.safety_checklist_templates'
      ])
      AND (
        SELECT array_agg(a.attname ORDER BY a.attname)
        FROM unnest(c.conkey) AS k(colnum)
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.colnum
      ) = ARRAY['auth0_org_id', 'id']::name[]
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I CASCADE', r.tbl, r.conname);
  END LOOP;
END
$uq$;

-- ---- 3. Reorder the two user-keyed composite uniques org-id-first ----
DO $uq2$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass::text AS tbl, c.conname
    FROM pg_constraint c
    WHERE c.contype = 'u'
      AND c.conrelid::regclass::text = ANY (ARRAY['public.user_credentials', 'public.org_members'])
      AND (
        SELECT array_agg(a.attname ORDER BY a.attname)
        FROM unnest(c.conkey) AS k(colnum)
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.colnum
      ) = ARRAY['auth0_org_id', 'auth0_user_id']::name[]
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I CASCADE', r.tbl, r.conname);
  END LOOP;
END
$uq2$;

alter table public.user_credentials drop constraint if exists user_credentials_org_user_key;
alter table public.user_credentials add constraint user_credentials_org_user_key
  unique (auth0_org_id, auth0_user_id);

alter table public.org_members drop constraint if exists org_members_org_user_key;
alter table public.org_members add constraint org_members_org_user_key
  unique (auth0_org_id, auth0_user_id);

-- ---- 4. Recreate every FK, org-id-first, same ON DELETE semantics as before drift ----
-- Idempotent: DROP IF EXISTS first so this migration can be re-run safely.
alter table public.org_sites drop constraint if exists org_sites_department_fkey;
alter table public.org_sites add constraint org_sites_department_fkey
  foreign key (auth0_org_id, department_id) references public.org_departments (auth0_org_id, id)
  on delete restrict;

alter table public.org_members drop constraint if exists org_members_department_fkey;
alter table public.org_members add constraint org_members_department_fkey
  foreign key (auth0_org_id, department_id) references public.org_departments (auth0_org_id, id)
  on delete no action;
alter table public.org_members drop constraint if exists org_members_site_fkey;
alter table public.org_members add constraint org_members_site_fkey
  foreign key (auth0_org_id, site_id) references public.org_sites (auth0_org_id, id)
  on delete no action;
alter table public.org_members drop constraint if exists org_members_job_role_fkey;
alter table public.org_members add constraint org_members_job_role_fkey
  foreign key (auth0_org_id, job_role_id) references public.org_roles (auth0_org_id, id)
  on delete no action;
alter table public.org_members drop constraint if exists org_members_shift_fkey;
alter table public.org_members add constraint org_members_shift_fkey
  foreign key (auth0_org_id, shift_id) references public.org_shifts (auth0_org_id, id)
  on delete no action;
-- manager_id identifies another org_members row by auth0_user_id (managers are
-- members of the same org too), not by the membership's own uuid id. That was
-- always the intent (see the org_members_no_self_manage check below, which
-- only makes sense compared against auth0_user_id) but manager_id pre-dated
-- this migration as a uuid column referencing org_members.id -- align it here.
DO $mgr$
BEGIN
  IF (
    SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'org_members' AND column_name = 'manager_id'
  ) = 'uuid' THEN
    ALTER TABLE public.org_members ALTER COLUMN manager_id TYPE text USING manager_id::text;

    -- Old values were membership ids; translate to that manager's auth0_user_id.
    UPDATE public.org_members m
    SET manager_id = mgr.auth0_user_id
    FROM public.org_members mgr
    WHERE m.manager_id IS NOT NULL
      AND m.manager_id = mgr.id::text
      AND m.auth0_org_id = mgr.auth0_org_id;
  END IF;
END
$mgr$;

alter table public.org_members drop constraint if exists org_members_manager_id_chk;
alter table public.org_members add constraint org_members_manager_id_chk
  check (length(btrim(manager_id)) > 0);
alter table public.org_members drop constraint if exists org_members_no_self_manage;
alter table public.org_members add constraint org_members_no_self_manage
  check (manager_id is distinct from auth0_user_id);

alter table public.org_members drop constraint if exists org_members_manager_fkey;
alter table public.org_members add constraint org_members_manager_fkey
  foreign key (auth0_org_id, manager_id) references public.org_members (auth0_org_id, auth0_user_id)
  on delete no action;
alter table public.org_members drop constraint if exists org_members_user_fkey;
alter table public.org_members add constraint org_members_user_fkey
  foreign key (auth0_org_id, auth0_user_id)
  references public.user_credentials (auth0_org_id, auth0_user_id) on delete cascade;

alter table public.org_attendance drop constraint if exists org_attendance_department_fkey;
alter table public.org_attendance add constraint org_attendance_department_fkey
  foreign key (auth0_org_id, department_id) references public.org_departments (auth0_org_id, id)
  on delete no action;
alter table public.org_attendance drop constraint if exists org_attendance_site_fkey;
alter table public.org_attendance add constraint org_attendance_site_fkey
  foreign key (auth0_org_id, site_id) references public.org_sites (auth0_org_id, id)
  on delete no action;
alter table public.org_attendance drop constraint if exists org_attendance_member_fkey;
alter table public.org_attendance add constraint org_attendance_member_fkey
  foreign key (auth0_org_id, auth0_user_id) references public.org_members (auth0_org_id, auth0_user_id)
  on delete cascade;

alter table public.org_leave_balances drop constraint if exists org_leave_balances_member_fkey;
alter table public.org_leave_balances add constraint org_leave_balances_member_fkey
  foreign key (auth0_org_id, auth0_user_id) references public.org_members (auth0_org_id, auth0_user_id)
  on delete cascade;

alter table public.audit_logs drop constraint if exists audit_logs_actor_fkey;
alter table public.audit_logs add constraint audit_logs_actor_fkey
  foreign key (auth0_org_id, auth0_user_id)
  references public.user_credentials (auth0_org_id, auth0_user_id) on delete restrict;

alter table public.labour_forecasts drop constraint if exists labour_forecasts_site_fkey;
alter table public.labour_forecasts add constraint labour_forecasts_site_fkey
  foreign key (auth0_org_id, site_id) references public.org_sites (auth0_org_id, id) on delete cascade;
alter table public.labour_forecasts drop constraint if exists labour_forecasts_generator_fkey;
alter table public.labour_forecasts add constraint labour_forecasts_generator_fkey
  foreign key (auth0_org_id, generated_by) references public.org_members (auth0_org_id, auth0_user_id)
  on delete no action;

alter table public.labour_alerts drop constraint if exists labour_alerts_forecast_fkey;
alter table public.labour_alerts add constraint labour_alerts_forecast_fkey
  foreign key (auth0_org_id, forecast_id) references public.labour_forecasts (auth0_org_id, id)
  on delete cascade;
alter table public.labour_alerts drop constraint if exists labour_alerts_site_fkey;
alter table public.labour_alerts add constraint labour_alerts_site_fkey
  foreign key (auth0_org_id, site_id) references public.org_sites (auth0_org_id, id) on delete cascade;
alter table public.labour_alerts drop constraint if exists labour_alerts_member_fkey;
alter table public.labour_alerts add constraint labour_alerts_member_fkey
  foreign key (auth0_org_id, auth0_user_id) references public.org_members (auth0_org_id, auth0_user_id)
  on delete cascade;
alter table public.labour_alerts drop constraint if exists labour_alerts_ack_fkey;
alter table public.labour_alerts add constraint labour_alerts_ack_fkey
  foreign key (auth0_org_id, acknowledged_by) references public.org_members (auth0_org_id, auth0_user_id)
  on delete no action;

alter table public.payroll_export_runs drop constraint if exists payroll_export_runs_generator_fkey;
alter table public.payroll_export_runs add constraint payroll_export_runs_generator_fkey
  foreign key (auth0_org_id, generated_by) references public.org_members (auth0_org_id, auth0_user_id)
  on delete no action;

alter table public.support_tickets drop constraint if exists support_tickets_creator_fkey;
alter table public.support_tickets add constraint support_tickets_creator_fkey
  foreign key (auth0_org_id, created_by) references public.org_members (auth0_org_id, auth0_user_id)
  on delete no action;
alter table public.support_messages drop constraint if exists support_messages_ticket_fkey;
alter table public.support_messages add constraint support_messages_ticket_fkey
  foreign key (auth0_org_id, ticket_id) references public.support_tickets (auth0_org_id, id)
  on delete cascade;

alter table public.safety_checklist_templates drop constraint if exists safety_templates_creator_fkey;
alter table public.safety_checklist_templates add constraint safety_templates_creator_fkey
  foreign key (auth0_org_id, created_by) references public.org_members (auth0_org_id, auth0_user_id)
  on delete no action;
alter table public.safety_checklist_responses drop constraint if exists safety_responses_template_fkey;
alter table public.safety_checklist_responses add constraint safety_responses_template_fkey
  foreign key (auth0_org_id, template_id)
  references public.safety_checklist_templates (auth0_org_id, id) on delete restrict;
alter table public.safety_checklist_responses drop constraint if exists safety_responses_member_fkey;
alter table public.safety_checklist_responses add constraint safety_responses_member_fkey
  foreign key (auth0_org_id, auth0_user_id) references public.org_members (auth0_org_id, auth0_user_id)
  on delete cascade;
alter table public.safety_checklist_responses drop constraint if exists safety_responses_shift_fkey;
alter table public.safety_checklist_responses add constraint safety_responses_shift_fkey
  foreign key (auth0_org_id, shift_id) references public.org_shifts (auth0_org_id, id) on delete no action;
alter table public.safety_checklist_responses drop constraint if exists safety_responses_site_fkey;
alter table public.safety_checklist_responses add constraint safety_responses_site_fkey
  foreign key (auth0_org_id, site_id) references public.org_sites (auth0_org_id, id) on delete no action;

alter table public.incident_reports drop constraint if exists incident_reports_reporter_fkey;
alter table public.incident_reports add constraint incident_reports_reporter_fkey
  foreign key (auth0_org_id, reporter_id) references public.org_members (auth0_org_id, auth0_user_id)
  on delete restrict;
alter table public.incident_reports drop constraint if exists incident_reports_manager_fkey;
alter table public.incident_reports add constraint incident_reports_manager_fkey
  foreign key (auth0_org_id, manager_user_id) references public.org_members (auth0_org_id, auth0_user_id)
  on delete no action;
alter table public.incident_reports drop constraint if exists incident_reports_site_fkey;
alter table public.incident_reports add constraint incident_reports_site_fkey
  foreign key (auth0_org_id, site_id) references public.org_sites (auth0_org_id, id) on delete no action;
alter table public.incident_reports drop constraint if exists incident_reports_department_fkey;
alter table public.incident_reports add constraint incident_reports_department_fkey
  foreign key (auth0_org_id, department_id) references public.org_departments (auth0_org_id, id)
  on delete no action;

-- ---- 5. Reorder FK-support indexes to lead with auth0_org_id (org-scoped leftmost prefix) ----
drop index if exists idx_sites_department;
create index idx_sites_department on public.org_sites (auth0_org_id, department_id);

drop index if exists idx_members_department;
create index idx_members_department on public.org_members (auth0_org_id, department_id);
drop index if exists idx_members_site;
create index idx_members_site on public.org_members (auth0_org_id, site_id);
drop index if exists idx_members_shift;
create index idx_members_shift on public.org_members (auth0_org_id, shift_id);
drop index if exists idx_members_job_role;
create index idx_members_job_role on public.org_members (auth0_org_id, job_role_id);
drop index if exists idx_members_manager;
create index idx_members_manager on public.org_members (auth0_org_id, manager_id);

drop index if exists idx_attendance_site;
create index idx_attendance_site on public.org_attendance (auth0_org_id, site_id);
drop index if exists idx_attendance_department;
create index idx_attendance_department on public.org_attendance (auth0_org_id, department_id);

drop index if exists idx_audit_actor;
create index idx_audit_actor on public.audit_logs (auth0_org_id, auth0_user_id);

drop index if exists idx_forecasts_site;
create index idx_forecasts_site on public.labour_forecasts (auth0_org_id, site_id);
drop index if exists idx_forecasts_generator;
create index idx_forecasts_generator on public.labour_forecasts (auth0_org_id, generated_by);

drop index if exists idx_alerts_forecast;
create index idx_alerts_forecast on public.labour_alerts (auth0_org_id, forecast_id);
drop index if exists idx_alerts_site;
create index idx_alerts_site on public.labour_alerts (auth0_org_id, site_id);
drop index if exists idx_alerts_ack;
create index idx_alerts_ack on public.labour_alerts (auth0_org_id, acknowledged_by);

drop index if exists idx_payroll_generator;
create index idx_payroll_generator on public.payroll_export_runs (auth0_org_id, generated_by);

drop index if exists idx_tickets_creator;
create index idx_tickets_creator on public.support_tickets (auth0_org_id, created_by);

drop index if exists idx_safety_templates_creator;
create index idx_safety_templates_creator on public.safety_checklist_templates (auth0_org_id, created_by);
drop index if exists idx_safety_responses_template;
create index idx_safety_responses_template on public.safety_checklist_responses (auth0_org_id, template_id);
drop index if exists idx_safety_responses_shift;
create index idx_safety_responses_shift on public.safety_checklist_responses (auth0_org_id, shift_id);
drop index if exists idx_safety_responses_site;
create index idx_safety_responses_site on public.safety_checklist_responses (auth0_org_id, site_id);

drop index if exists idx_incidents_manager;
create index idx_incidents_manager on public.incident_reports (auth0_org_id, manager_user_id);
drop index if exists idx_incidents_site;
create index idx_incidents_site on public.incident_reports (auth0_org_id, site_id);
drop index if exists idx_incidents_department;
create index idx_incidents_department on public.incident_reports (auth0_org_id, department_id);
