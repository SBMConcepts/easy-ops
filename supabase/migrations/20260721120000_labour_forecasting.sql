-- Predictive Labour Forecasting: forecast snapshots + operational alerts.
--
-- Adapted from the reference design to the EasyOps v2 schema:
--   * tenant key is organizations.auth0_org_id (TEXT PK), NOT a UUID
--     organisations.id.
--   * sites live in org_sites; employees are keyed by auth0_user_id (TEXT).
--   * there is no auth.users / profiles / has_role(); RLS uses the same
--     public.has_permission(<scope>) + public.org_id() + active-org_members
--     pattern as every other table (see 20260706200000_rls_has_permission.sql).
--   * no update_updated_at_column() trigger function exists in this DB, so the
--     reference trg_alerts_updated_at is intentionally omitted; labour_alerts.
--     updated_at is maintained by the Express service-role layer
--     (server/routes/labour-forecasting.ts).
--
-- Access model (mirrors server/lib/permissions.ts):
--   read/write/delete:labour_forecasts, read/write/delete:labour_alerts.

-- ── Enums ───────────────────────────────────────────────────────────────────
create type "public"."forecast_alert_type" as enum (
  'overtime_risk', 'staffing_shortage', 'understaffed_shift', 'burnout_risk'
);
create type "public"."forecast_alert_severity" as enum ('low', 'medium', 'high', 'critical');
create type "public"."forecast_alert_status" as enum ('open', 'acknowledged', 'resolved', 'dismissed');

-- ── labour_forecasts: one forecast snapshot per generation run ──────────────
create table "public"."labour_forecasts" (
  "id" uuid not null default gen_random_uuid(),
  "auth0_org_id" text not null,
  "site_id" uuid,
  "forecast_date" date not null,
  "horizon_days" integer not null default 7,
  "predicted_required_staff" integer,
  "predicted_hours" numeric(8,2),
  "demand_score" numeric(4,2),
  "confidence" numeric(4,2),
  "model" text,
  "reasoning" text,
  "input_summary" jsonb,
  -- Auth0 subject of the caller who generated the snapshot (no auth.users FK).
  "generated_by" text,
  "created_at" timestamp with time zone not null default now()
);

alter table "public"."labour_forecasts" enable row level security;

create unique index labour_forecasts_pkey on public.labour_forecasts using btree (id);
alter table "public"."labour_forecasts"
  add constraint "labour_forecasts_pkey" primary key using index "labour_forecasts_pkey";

alter table "public"."labour_forecasts" add constraint "labour_forecasts_auth0_org_id_fkey"
  foreign key (auth0_org_id) references public.organizations(auth0_org_id)
  on update cascade on delete cascade not valid;
alter table "public"."labour_forecasts" validate constraint "labour_forecasts_auth0_org_id_fkey";

alter table "public"."labour_forecasts" add constraint "labour_forecasts_site_id_fkey"
  foreign key (site_id) references public.org_sites(id) on delete set null not valid;
alter table "public"."labour_forecasts" validate constraint "labour_forecasts_site_id_fkey";

create index idx_forecasts_org_date on public.labour_forecasts using btree (auth0_org_id, forecast_date);

-- ── labour_alerts: actionable staffing/compliance signals from a forecast ───
create table "public"."labour_alerts" (
  "id" uuid not null default gen_random_uuid(),
  "auth0_org_id" text not null,
  "forecast_id" uuid,
  "site_id" uuid,
  -- Affected employee, keyed to the Auth0 subject stored in user_credentials.
  "auth0_user_id" text,
  "alert_type" public.forecast_alert_type not null,
  "severity" public.forecast_alert_severity not null default 'medium',
  "status" public.forecast_alert_status not null default 'open',
  "target_date" date,
  "title" text not null,
  "detail" text,
  "recommended_action" text,
  "metrics" jsonb,
  -- Auth0 subject of the caller who acknowledged the alert (no auth.users FK).
  "acknowledged_by" text,
  "acknowledged_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table "public"."labour_alerts" enable row level security;

create unique index labour_alerts_pkey on public.labour_alerts using btree (id);
alter table "public"."labour_alerts"
  add constraint "labour_alerts_pkey" primary key using index "labour_alerts_pkey";

alter table "public"."labour_alerts" add constraint "labour_alerts_auth0_org_id_fkey"
  foreign key (auth0_org_id) references public.organizations(auth0_org_id)
  on update cascade on delete cascade not valid;
alter table "public"."labour_alerts" validate constraint "labour_alerts_auth0_org_id_fkey";

alter table "public"."labour_alerts" add constraint "labour_alerts_forecast_id_fkey"
  foreign key (forecast_id) references public.labour_forecasts(id) on delete set null not valid;
alter table "public"."labour_alerts" validate constraint "labour_alerts_forecast_id_fkey";

alter table "public"."labour_alerts" add constraint "labour_alerts_site_id_fkey"
  foreign key (site_id) references public.org_sites(id) on delete set null not valid;
alter table "public"."labour_alerts" validate constraint "labour_alerts_site_id_fkey";

-- Affected employee -> user_credentials.auth0_user_id (UNIQUE target). The
-- credential row always exists by the time an alert can reference the member
-- (created at signup). ON DELETE SET NULL preserves the alert history if the
-- credential is later removed.
alter table "public"."labour_alerts" add constraint "labour_alerts_auth0_user_id_fkey"
  foreign key (auth0_user_id) references public.user_credentials(auth0_user_id)
  on update cascade on delete set null not valid;
alter table "public"."labour_alerts" validate constraint "labour_alerts_auth0_user_id_fkey";

create index idx_alerts_org_status
  on public.labour_alerts using btree (auth0_org_id, status, created_at desc);

-- ── Grants ──────────────────────────────────────────────────────────────────
grant select, insert, update, delete on table "public"."labour_forecasts" to authenticated;
grant all on table "public"."labour_forecasts" to service_role;
grant select, insert, update, delete on table "public"."labour_alerts" to authenticated;
grant all on table "public"."labour_alerts" to service_role;

-- ── RLS: bind to the same fine-grained scopes Express enforces ──────────────
-- Direct authenticated-client access is tenant-isolated (auth0_org_id =
-- org_id()), requires an active org_members row in that org, and the matching
-- has_permission(<scope>) claim. The Express service-role layer bypasses RLS.

-- labour_forecasts --------------------------------------------------------------
create policy "labour_forecasts: members can select"
  on "public"."labour_forecasts" as permissive for select to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = labour_forecasts.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('read:labour_forecasts'));

create policy "labour_forecasts: managers can insert"
  on "public"."labour_forecasts" as permissive for insert to public
with check (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = labour_forecasts.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:labour_forecasts'));

create policy "labour_forecasts: managers can update"
  on "public"."labour_forecasts" as permissive for update to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = labour_forecasts.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:labour_forecasts'))
with check (
  (auth0_org_id = public.org_id())
  AND public.has_permission('write:labour_forecasts'));

create policy "labour_forecasts: admins can delete"
  on "public"."labour_forecasts" as permissive for delete to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = labour_forecasts.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('delete:labour_forecasts'));

-- labour_alerts -----------------------------------------------------------------
create policy "labour_alerts: members can select"
  on "public"."labour_alerts" as permissive for select to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = labour_alerts.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('read:labour_alerts'));

create policy "labour_alerts: managers can insert"
  on "public"."labour_alerts" as permissive for insert to public
with check (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = labour_alerts.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:labour_alerts'));

create policy "labour_alerts: managers can update"
  on "public"."labour_alerts" as permissive for update to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = labour_alerts.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:labour_alerts'))
with check (
  (auth0_org_id = public.org_id())
  AND public.has_permission('write:labour_alerts'));

create policy "labour_alerts: admins can delete"
  on "public"."labour_alerts" as permissive for delete to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = labour_alerts.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('delete:labour_alerts'));
