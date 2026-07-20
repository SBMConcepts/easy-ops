-- Payroll Export Pro: employment pay attributes + payroll export audit trail.
--
-- Adapted from the reference design to the EasyOps v2 schema:
--   * there is no `profiles` table — per-employment pay attributes belong on
--     org_members (which already carries employment_type). hourly_rate and
--     tax_number are added there so gross-pay math resolves per membership.
--   * tenant key is organizations.auth0_org_id (TEXT PK), NOT a UUID.
--   * no auth.users / has_role(); RLS uses the same public.has_permission(<scope>)
--     + public.org_id() + active-org_members pattern as every other table
--     (see 20260706200000_rls_has_permission.sql).
--   * export CSV blobs are NOT persisted; only run metadata + totals are stored
--     for audit/history. The register itself is recomputed on demand by the
--     Supabase Edge Function (supabase/functions/payroll-export).
--
-- Access model (mirrors server/lib/permissions.ts):
--   read/write/delete:payroll_exports.

-- ── org_members: pay attributes for gross-pay math ──────────────────────────
alter table "public"."org_members" add column "hourly_rate" numeric(10,2);
alter table "public"."org_members" add column "tax_number" text;

-- ── payroll_export_runs: one row per generated payroll export (audit) ───────
create table "public"."payroll_export_runs" (
  "id" uuid not null default gen_random_uuid(),
  "auth0_org_id" text not null,
  "period_start" date not null,
  "period_end" date not null,
  -- Export layout the caller downloaded: full | sage | xero | payspace | sars_emp201.
  "format" text not null,
  "employee_count" integer not null default 0,
  "gross_total" numeric(14,2) not null default 0,
  "paye_total" numeric(14,2) not null default 0,
  "uif_total" numeric(14,2) not null default 0,
  "net_total" numeric(14,2) not null default 0,
  -- Auth0 subject of the caller who ran the export (no auth.users FK).
  "generated_by" text,
  "created_at" timestamp with time zone not null default now()
);

alter table "public"."payroll_export_runs" enable row level security;

create unique index payroll_export_runs_pkey on public.payroll_export_runs using btree (id);
alter table "public"."payroll_export_runs"
  add constraint "payroll_export_runs_pkey" primary key using index "payroll_export_runs_pkey";

alter table "public"."payroll_export_runs" add constraint "payroll_export_runs_auth0_org_id_fkey"
  foreign key (auth0_org_id) references public.organizations(auth0_org_id)
  on update cascade on delete cascade not valid;
alter table "public"."payroll_export_runs" validate constraint "payroll_export_runs_auth0_org_id_fkey";

create index idx_payroll_runs_org_created
  on public.payroll_export_runs using btree (auth0_org_id, created_at desc);

-- ── Grants ──────────────────────────────────────────────────────────────────
grant select, insert, update, delete on table "public"."payroll_export_runs" to authenticated;
grant all on table "public"."payroll_export_runs" to service_role;

-- ── RLS: bind to the same fine-grained scopes Express enforces ──────────────
-- Direct authenticated-client access is tenant-isolated (auth0_org_id =
-- org_id()), requires an active org_members row in that org, and the matching
-- has_permission(<scope>) claim. The Express service-role layer bypasses RLS.

create policy "payroll_export_runs: members can select"
  on "public"."payroll_export_runs" as permissive for select to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = payroll_export_runs.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('read:payroll_exports'));

create policy "payroll_export_runs: admins can insert"
  on "public"."payroll_export_runs" as permissive for insert to public
with check (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = payroll_export_runs.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:payroll_exports'));

create policy "payroll_export_runs: admins can delete"
  on "public"."payroll_export_runs" as permissive for delete to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = payroll_export_runs.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('delete:payroll_exports'));
