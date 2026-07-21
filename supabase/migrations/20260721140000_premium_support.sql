-- Premium Support: support tickets, threaded messages, and CSM assignments.
--
-- Adapted from the reference design to the EasyOps v2 schema:
--   * tenant key is organizations.auth0_org_id (TEXT PK), NOT a UUID.
--   * there is no auth.users / profiles / has_role(); RLS uses the same
--     public.has_permission(<scope>) + public.org_id() + active-org_members
--     pattern as every other table (see 20260706200000_rls_has_permission.sql).
--   * actor columns (created_by, assigned_to, author_id) hold the caller's
--     Auth0 subject as plain text (no auth.users FK), matching
--     labour_forecasts.generated_by / payroll_export_runs.generated_by.
--   * no update_updated_at_column() trigger function exists in this DB, so
--     updated_at is maintained by the Express service-role layer
--     (server/routes/support.ts) and the support-ticket edge function.
--
-- SLA model: the support-ticket edge function stamps sla_response_due and
-- sla_resolution_due at creation from the org plan (Enterprise 2/24h,
-- Business=Pro 4/48h, Growth 8/72h, Starter 24/120h, Free 48/168h). Breach
-- flags are derived in the UI by comparing now() against these deadlines.
--
-- Access model (mirrors server/lib/permissions.ts):
--   read/write/delete:support_tickets, read/write/delete:support_messages,
--   read/write/delete:csm_assignments.

-- ── Enums ───────────────────────────────────────────────────────────────────
create type "public"."support_ticket_status" as enum (
  'open', 'in_progress', 'resolved', 'closed'
);
create type "public"."support_ticket_priority" as enum ('low', 'medium', 'high', 'urgent');
create type "public"."support_ticket_category" as enum (
  'technical', 'billing', 'feature_request', 'account', 'general'
);
create type "public"."support_message_author" as enum ('customer', 'agent', 'system');

-- ── support_tickets: one row per support request ────────────────────────────
create table "public"."support_tickets" (
  "id" uuid not null default gen_random_uuid(),
  "auth0_org_id" text not null,
  "subject" text not null,
  "description" text,
  "category" public.support_ticket_category not null default 'general',
  "priority" public.support_ticket_priority not null default 'medium',
  "status" public.support_ticket_status not null default 'open',
  -- The org plan captured when the ticket was opened (SLA tier provenance).
  "plan_at_creation" text,
  -- Plan-based SLA deadlines stamped by the support-ticket edge function.
  "sla_response_due" timestamp with time zone,
  "sla_resolution_due" timestamp with time zone,
  "first_response_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "closed_at" timestamp with time zone,
  -- Auth0 subjects (no auth.users FK): reporter and assigned agent/CSM.
  "created_by" text,
  "assigned_to" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table "public"."support_tickets" enable row level security;

create unique index support_tickets_pkey on public.support_tickets using btree (id);
alter table "public"."support_tickets"
  add constraint "support_tickets_pkey" primary key using index "support_tickets_pkey";

alter table "public"."support_tickets" add constraint "support_tickets_auth0_org_id_fkey"
  foreign key (auth0_org_id) references public.organizations(auth0_org_id)
  on update cascade on delete cascade not valid;
alter table "public"."support_tickets" validate constraint "support_tickets_auth0_org_id_fkey";

create index idx_support_tickets_org_status
  on public.support_tickets using btree (auth0_org_id, status, created_at desc);

-- ── support_messages: threaded replies on a ticket ──────────────────────────
create table "public"."support_messages" (
  "id" uuid not null default gen_random_uuid(),
  "ticket_id" uuid not null,
  -- Denormalized tenant key so RLS can scope messages without a ticket join.
  "auth0_org_id" text not null,
  -- Auth0 subject of the message author (no auth.users FK).
  "author_id" text,
  "author_role" public.support_message_author not null default 'customer',
  "body" text not null,
  -- Internal notes are visible to staff (agents) only; hidden from customers.
  "is_internal" boolean not null default false,
  "created_at" timestamp with time zone not null default now()
);

alter table "public"."support_messages" enable row level security;

create unique index support_messages_pkey on public.support_messages using btree (id);
alter table "public"."support_messages"
  add constraint "support_messages_pkey" primary key using index "support_messages_pkey";

alter table "public"."support_messages" add constraint "support_messages_ticket_id_fkey"
  foreign key (ticket_id) references public.support_tickets(id) on delete cascade not valid;
alter table "public"."support_messages" validate constraint "support_messages_ticket_id_fkey";

alter table "public"."support_messages" add constraint "support_messages_auth0_org_id_fkey"
  foreign key (auth0_org_id) references public.organizations(auth0_org_id)
  on update cascade on delete cascade not valid;
alter table "public"."support_messages" validate constraint "support_messages_auth0_org_id_fkey";

create index idx_support_messages_ticket
  on public.support_messages using btree (ticket_id, created_at);

-- ── csm_assignments: one Customer Success Manager per org (Enterprise) ──────
create table "public"."csm_assignments" (
  "id" uuid not null default gen_random_uuid(),
  "auth0_org_id" text not null,
  "csm_name" text not null,
  "csm_email" text not null,
  "csm_phone" text,
  "csm_title" text,
  "calendar_url" text,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table "public"."csm_assignments" enable row level security;

create unique index csm_assignments_pkey on public.csm_assignments using btree (id);
alter table "public"."csm_assignments"
  add constraint "csm_assignments_pkey" primary key using index "csm_assignments_pkey";

-- One CSM record per organization.
create unique index csm_assignments_auth0_org_id_key
  on public.csm_assignments using btree (auth0_org_id);

alter table "public"."csm_assignments" add constraint "csm_assignments_auth0_org_id_fkey"
  foreign key (auth0_org_id) references public.organizations(auth0_org_id)
  on update cascade on delete cascade not valid;
alter table "public"."csm_assignments" validate constraint "csm_assignments_auth0_org_id_fkey";

-- ── Grants ──────────────────────────────────────────────────────────────────
grant select, insert, update, delete on table "public"."support_tickets" to authenticated;
grant all on table "public"."support_tickets" to service_role;
grant select, insert, update, delete on table "public"."support_messages" to authenticated;
grant all on table "public"."support_messages" to service_role;
grant select, insert, update, delete on table "public"."csm_assignments" to authenticated;
grant all on table "public"."csm_assignments" to service_role;

-- ── RLS: bind to the same fine-grained scopes Express enforces ──────────────
-- Direct authenticated-client access is tenant-isolated (auth0_org_id =
-- org_id()), requires an active org_members row in that org, and the matching
-- has_permission(<scope>) claim. The Express service-role layer bypasses RLS.

-- support_tickets ---------------------------------------------------------------
create policy "support_tickets: members can select"
  on "public"."support_tickets" as permissive for select to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = support_tickets.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('read:support_tickets'));

create policy "support_tickets: members can insert"
  on "public"."support_tickets" as permissive for insert to public
with check (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = support_tickets.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:support_tickets'));

create policy "support_tickets: members can update"
  on "public"."support_tickets" as permissive for update to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = support_tickets.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:support_tickets'))
with check (
  (auth0_org_id = public.org_id())
  AND public.has_permission('write:support_tickets'));

create policy "support_tickets: admins can delete"
  on "public"."support_tickets" as permissive for delete to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = support_tickets.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('delete:support_tickets'));

-- support_messages --------------------------------------------------------------
create policy "support_messages: members can select"
  on "public"."support_messages" as permissive for select to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = support_messages.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('read:support_messages'));

create policy "support_messages: members can insert"
  on "public"."support_messages" as permissive for insert to public
with check (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = support_messages.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:support_messages'));

create policy "support_messages: admins can delete"
  on "public"."support_messages" as permissive for delete to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = support_messages.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('delete:support_messages'));

-- csm_assignments ---------------------------------------------------------------
create policy "csm_assignments: members can select"
  on "public"."csm_assignments" as permissive for select to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = csm_assignments.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('read:csm_assignments'));

create policy "csm_assignments: admins can insert"
  on "public"."csm_assignments" as permissive for insert to public
with check (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = csm_assignments.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:csm_assignments'));

create policy "csm_assignments: admins can update"
  on "public"."csm_assignments" as permissive for update to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = csm_assignments.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:csm_assignments'))
with check (
  (auth0_org_id = public.org_id())
  AND public.has_permission('write:csm_assignments'));

create policy "csm_assignments: admins can delete"
  on "public"."csm_assignments" as permissive for delete to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = csm_assignments.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('delete:csm_assignments'));
