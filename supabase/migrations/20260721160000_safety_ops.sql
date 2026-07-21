-- Safety Ops: reusable shift-start checklists, staff sign-off responses, and
-- incident reports with reporter + manager e-signatures.
--
-- Adapted from the reference design to the EasyOps v2 schema:
--   * tenant key is organizations.auth0_org_id (TEXT PK), NOT a UUID
--     organisation_id -> organisations(id).
--   * there is no auth.users / profiles / has_role() / get_user_organisation();
--     RLS uses the same public.has_permission(<scope>) + public.org_id() +
--     active-org_members pattern as every other table
--     (see 20260706200000_rls_has_permission.sql).
--   * actor columns (created_by, user_id, reporter_id, manager_id) hold the
--     caller's Auth0 subject as plain text (no auth.users FK), matching
--     support_tickets.created_by / payroll_export_runs.generated_by.
--   * shift/site/department references point at org_shifts / org_sites /
--     org_departments (there are no roster_shifts / sites / departments tables).
--   * severity / status / type are enums (matching the support_ticket_* enum
--     style) instead of free-text CHECK columns.
--   * no update_updated_at_column() trigger function exists in this DB, so
--     updated_at is maintained by the Express service-role layer
--     (server/routes/safety.ts).
--   * the feature is gated behind the Business tier (mapped to the pro +
--     enterprise plans) in the Express router + the frontend feature flag;
--     there is no plan_features table in this schema.
--
-- Access model (mirrors server/lib/permissions.ts):
--   read/write/delete:safety_templates, read/write/delete:safety_checklists,
--   read/write/delete:incident_reports.

-- ── Enums ───────────────────────────────────────────────────────────────────
create type "public"."incident_type" as enum (
  'injury', 'near_miss', 'property_damage', 'environmental',
  'security', 'equipment_failure', 'other'
);
create type "public"."incident_severity" as enum ('low', 'medium', 'high', 'critical');
create type "public"."incident_status" as enum ('open', 'under_review', 'resolved', 'closed');

-- ── safety_checklist_templates: reusable shift-start checklists ──────────────
create table "public"."safety_checklist_templates" (
  "id" uuid not null default gen_random_uuid(),
  "auth0_org_id" text not null,
  "name" text not null,
  "description" text,
  -- Checklist item definitions: [{ "key": "ppe", "label": "PPE worn", "required": true }, ...]
  "items" jsonb not null default '[]'::jsonb,
  "required_at_shift_start" boolean not null default true,
  "active" boolean not null default true,
  -- Auth0 subject of the admin/manager who authored the template (no FK).
  "created_by" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table "public"."safety_checklist_templates" enable row level security;

create unique index safety_checklist_templates_pkey
  on public.safety_checklist_templates using btree (id);
alter table "public"."safety_checklist_templates"
  add constraint "safety_checklist_templates_pkey"
  primary key using index "safety_checklist_templates_pkey";

alter table "public"."safety_checklist_templates"
  add constraint "safety_checklist_templates_auth0_org_id_fkey"
  foreign key (auth0_org_id) references public.organizations(auth0_org_id)
  on update cascade on delete cascade not valid;
alter table "public"."safety_checklist_templates"
  validate constraint "safety_checklist_templates_auth0_org_id_fkey";

create index idx_safety_checklist_templates_org
  on public.safety_checklist_templates using btree (auth0_org_id, active);

-- ── safety_checklist_responses: a staff member's signed submission ──────────
create table "public"."safety_checklist_responses" (
  "id" uuid not null default gen_random_uuid(),
  "auth0_org_id" text not null,
  "template_id" uuid not null,
  -- Auth0 subject of the staff member who completed & signed (no FK).
  "user_id" text not null,
  "shift_id" uuid,
  "site_id" uuid,
  -- Per-item answers: [{ "key": "ppe", "checked": true, "note": "" }, ...]
  "responses" jsonb not null default '[]'::jsonb,
  "passed" boolean not null default true,
  "notes" text,
  -- Base64 data-URL signature captured at submission.
  "signature_data" text not null,
  "signed_at" timestamp with time zone not null default now(),
  "created_at" timestamp with time zone not null default now()
);

alter table "public"."safety_checklist_responses" enable row level security;

create unique index safety_checklist_responses_pkey
  on public.safety_checklist_responses using btree (id);
alter table "public"."safety_checklist_responses"
  add constraint "safety_checklist_responses_pkey"
  primary key using index "safety_checklist_responses_pkey";

alter table "public"."safety_checklist_responses"
  add constraint "safety_checklist_responses_auth0_org_id_fkey"
  foreign key (auth0_org_id) references public.organizations(auth0_org_id)
  on update cascade on delete cascade not valid;
alter table "public"."safety_checklist_responses"
  validate constraint "safety_checklist_responses_auth0_org_id_fkey";

alter table "public"."safety_checklist_responses"
  add constraint "safety_checklist_responses_template_id_fkey"
  foreign key (template_id) references public.safety_checklist_templates(id)
  on delete cascade not valid;
alter table "public"."safety_checklist_responses"
  validate constraint "safety_checklist_responses_template_id_fkey";

alter table "public"."safety_checklist_responses"
  add constraint "safety_checklist_responses_shift_id_fkey"
  foreign key (shift_id) references public.org_shifts(id)
  on delete set null not valid;
alter table "public"."safety_checklist_responses"
  validate constraint "safety_checklist_responses_shift_id_fkey";

alter table "public"."safety_checklist_responses"
  add constraint "safety_checklist_responses_site_id_fkey"
  foreign key (site_id) references public.org_sites(id)
  on delete set null not valid;
alter table "public"."safety_checklist_responses"
  validate constraint "safety_checklist_responses_site_id_fkey";

create index idx_safety_checklist_responses_org
  on public.safety_checklist_responses using btree (auth0_org_id, created_at desc);
create index idx_safety_checklist_responses_template
  on public.safety_checklist_responses using btree (template_id);

-- ── incident_reports: reporter + manager counter-signed incidents ───────────
create table "public"."incident_reports" (
  "id" uuid not null default gen_random_uuid(),
  "auth0_org_id" text not null,
  -- Auth0 subject of the reporter (no FK).
  "reporter_id" text not null,
  "site_id" uuid,
  "department_id" uuid,
  "incident_type" public.incident_type not null,
  "severity" public.incident_severity not null,
  "occurred_at" timestamp with time zone not null default now(),
  "description" text not null,
  "actions_taken" text,
  "witnesses" text,
  -- Photo references / data-URLs captured with the report.
  "photos" jsonb not null default '[]'::jsonb,
  "reporter_signature" text not null,
  "reporter_signed_at" timestamp with time zone not null default now(),
  -- Manager counter-signature (populated at review; no FK).
  "manager_id" text,
  "manager_signature" text,
  "manager_signed_at" timestamp with time zone,
  "manager_notes" text,
  "status" public.incident_status not null default 'open',
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table "public"."incident_reports" enable row level security;

create unique index incident_reports_pkey on public.incident_reports using btree (id);
alter table "public"."incident_reports"
  add constraint "incident_reports_pkey" primary key using index "incident_reports_pkey";

alter table "public"."incident_reports"
  add constraint "incident_reports_auth0_org_id_fkey"
  foreign key (auth0_org_id) references public.organizations(auth0_org_id)
  on update cascade on delete cascade not valid;
alter table "public"."incident_reports"
  validate constraint "incident_reports_auth0_org_id_fkey";

alter table "public"."incident_reports"
  add constraint "incident_reports_site_id_fkey"
  foreign key (site_id) references public.org_sites(id)
  on delete set null not valid;
alter table "public"."incident_reports" validate constraint "incident_reports_site_id_fkey";

alter table "public"."incident_reports"
  add constraint "incident_reports_department_id_fkey"
  foreign key (department_id) references public.org_departments(id)
  on delete set null not valid;
alter table "public"."incident_reports" validate constraint "incident_reports_department_id_fkey";

create index idx_incident_reports_org_status
  on public.incident_reports using btree (auth0_org_id, status, occurred_at desc);

-- ── Grants ──────────────────────────────────────────────────────────────────
grant select, insert, update, delete on table "public"."safety_checklist_templates" to authenticated;
grant all on table "public"."safety_checklist_templates" to service_role;
grant select, insert, update, delete on table "public"."safety_checklist_responses" to authenticated;
grant all on table "public"."safety_checklist_responses" to service_role;
grant select, insert, update, delete on table "public"."incident_reports" to authenticated;
grant all on table "public"."incident_reports" to service_role;

-- ── RLS: bind to the same fine-grained scopes Express enforces ──────────────
-- Direct authenticated-client access is tenant-isolated (auth0_org_id =
-- org_id()), requires an active org_members row in that org, and the matching
-- has_permission(<scope>) claim. The Express service-role layer bypasses RLS.

-- safety_checklist_templates ----------------------------------------------------
create policy "safety_templates: members can select"
  on "public"."safety_checklist_templates" as permissive for select to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = safety_checklist_templates.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('read:safety_templates'));

create policy "safety_templates: managers can insert"
  on "public"."safety_checklist_templates" as permissive for insert to public
with check (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = safety_checklist_templates.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:safety_templates'));

create policy "safety_templates: managers can update"
  on "public"."safety_checklist_templates" as permissive for update to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = safety_checklist_templates.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:safety_templates'))
with check (
  (auth0_org_id = public.org_id())
  AND public.has_permission('write:safety_templates'));

create policy "safety_templates: admins can delete"
  on "public"."safety_checklist_templates" as permissive for delete to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = safety_checklist_templates.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('delete:safety_templates'));

-- safety_checklist_responses ----------------------------------------------------
create policy "safety_checklists: members can select"
  on "public"."safety_checklist_responses" as permissive for select to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = safety_checklist_responses.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('read:safety_checklists'));

create policy "safety_checklists: members can insert"
  on "public"."safety_checklist_responses" as permissive for insert to public
with check (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = safety_checklist_responses.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:safety_checklists'));

create policy "safety_checklists: admins can delete"
  on "public"."safety_checklist_responses" as permissive for delete to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = safety_checklist_responses.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('delete:safety_checklists'));

-- incident_reports --------------------------------------------------------------
create policy "incident_reports: members can select"
  on "public"."incident_reports" as permissive for select to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = incident_reports.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('read:incident_reports'));

create policy "incident_reports: members can insert"
  on "public"."incident_reports" as permissive for insert to public
with check (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = incident_reports.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:incident_reports'));

create policy "incident_reports: managers can update"
  on "public"."incident_reports" as permissive for update to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = incident_reports.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:incident_reports'))
with check (
  (auth0_org_id = public.org_id())
  AND public.has_permission('write:incident_reports'));

create policy "incident_reports: admins can delete"
  on "public"."incident_reports" as permissive for delete to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = incident_reports.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('delete:incident_reports'));
