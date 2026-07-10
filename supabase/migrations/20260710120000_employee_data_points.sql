-- Expand employee/member data points, organized into four functional groups:
--   1. Identity & Contact  -> users (personal, system-wide)
--   2. Employment & Org    -> org_members (per-org employment)
--   3. Operational         -> org_members + new org_shifts
--   4. Leave & Compliance  -> users (emergency contact) + new org_leave_balances
--
-- Design notes:
--  * Identity/contact is personal and lives on users (one row per person).
--  * Employment facts are per-org and live on org_members.
--  * Shifts and leave balances get dedicated tables (structured, extensible).
--  * Assignment FKs (manager, shift) use ON DELETE SET NULL so removing the
--    referenced row clears the pointer rather than deleting members.
--  * org_leave_balances uses a composite FK to org_members with ON DELETE
--    CASCADE (a leave balance has no meaning without its membership), mirroring
--    the existing org_attendance -> org_members composite FK.

-- ── 1. Identity & Contact: users ───────────────────────────────────────────
-- first_name/last_name are kept INDEPENDENT of the existing full_name column
-- (full_name is used for display everywhere and remains editable on its own).
alter table "public"."users" add column "first_name" text not null default '';
alter table "public"."users" add column "last_name" text not null default '';
alter table "public"."users" add column "mobile_number" text;
alter table "public"."users" add column "national_id" text;
alter table "public"."users" add column "id_type" text;
alter table "public"."users" add column "address" text;

alter table "public"."users" add constraint "users_id_type_check"
  check (id_type is null or id_type = any (array['sa_id'::text, 'passport'::text])) not valid;
alter table "public"."users" validate constraint "users_id_type_check";

-- mobile_number is the WhatsApp Check-In identifier -> unique system-wide
-- (partial: multiple rows may still have a NULL mobile number).
create unique index users_mobile_number_key on public.users using btree (mobile_number)
  where mobile_number is not null;

-- ── 4a. Emergency contact: users ────────────────────────────────────────────
alter table "public"."users" add column "emergency_contact_name" text;
alter table "public"."users" add column "emergency_contact_phone" text;

-- ── 2. Employment & Org structure: org_members ─────────────────────────────
alter table "public"."org_members" add column "employee_code" text;
alter table "public"."org_members" add column "manager_id" uuid;
alter table "public"."org_members" add column "employment_type" text;
alter table "public"."org_members" add column "shift_id" uuid;

alter table "public"."org_members" add constraint "org_members_employment_type_check"
  check (
    employment_type is null
    or employment_type = any (
      array['permanent'::text, 'contract'::text, 'part_time'::text, 'temporary'::text, 'shift_worker'::text]
    )
  ) not valid;
alter table "public"."org_members" validate constraint "org_members_employment_type_check";

-- Direct manager/supervisor: self-reference to another membership. SET NULL so
-- removing a manager's membership just clears their reports' manager pointer.
alter table "public"."org_members" add constraint "org_members_manager_id_fkey"
  foreign key (manager_id) references public.org_members(id) on delete set null not valid;
alter table "public"."org_members" validate constraint "org_members_manager_id_fkey";

-- Employee/payroll code: unique per org where present.
create unique index org_members_employee_code_key
  on public.org_members using btree (auth0_org_id, employee_code)
  where employee_code is not null;

create index org_members_manager_id_idx on public.org_members using btree (manager_id);
create index org_members_shift_id_idx on public.org_members using btree (shift_id);

-- ── 3. Operational: org_shifts (standard working hours / shift schedule) ────
create table "public"."org_shifts" (
  "id" uuid not null default gen_random_uuid(),
  "auth0_org_id" text not null,
  "name" text not null default '',
  "start_time" time without time zone,
  "end_time" time without time zone,
  "grace_period_minutes" integer not null default 0,
  "weekly_hours" numeric,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

alter table "public"."org_shifts" enable row level security;

create unique index org_shifts_pkey on public.org_shifts using btree (id);
alter table "public"."org_shifts" add constraint "org_shifts_pkey" primary key using index "org_shifts_pkey";

alter table "public"."org_shifts" add constraint "org_shifts_auth0_org_id_fkey"
  foreign key (auth0_org_id) references public.organizations(auth0_org_id) on update cascade on delete cascade not valid;
alter table "public"."org_shifts" validate constraint "org_shifts_auth0_org_id_fkey";

create unique index org_shifts_org_name_key on public.org_shifts using btree (auth0_org_id, lower(name));
create index org_shifts_org_id_idx on public.org_shifts using btree (auth0_org_id);

-- org_members.shift_id FK (org_shifts must exist first).
alter table "public"."org_members" add constraint "org_members_shift_id_fkey"
  foreign key (shift_id) references public.org_shifts(id) on delete set null not valid;
alter table "public"."org_members" validate constraint "org_members_shift_id_fkey";

-- ── 4b. Leave balances: org_leave_balances ─────────────────────────────────
create table "public"."org_leave_balances" (
  "id" uuid not null default gen_random_uuid(),
  "auth0_org_id" text not null,
  "auth0_user_id" text not null,
  "leave_type" text not null,
  "balance_days" numeric not null default 0,
  "updated_at" timestamp with time zone not null default now()
);

alter table "public"."org_leave_balances" enable row level security;

create unique index org_leave_balances_pkey on public.org_leave_balances using btree (id);
alter table "public"."org_leave_balances" add constraint "org_leave_balances_pkey" primary key using index "org_leave_balances_pkey";

alter table "public"."org_leave_balances" add constraint "org_leave_balances_leave_type_check"
  check (leave_type = any (array['annual'::text, 'sick'::text, 'family_responsibility'::text])) not valid;
alter table "public"."org_leave_balances" validate constraint "org_leave_balances_leave_type_check";

alter table "public"."org_leave_balances" add constraint "org_leave_balances_org_fkey"
  foreign key (auth0_org_id) references public.organizations(auth0_org_id) on update cascade on delete cascade not valid;
alter table "public"."org_leave_balances" validate constraint "org_leave_balances_org_fkey";

-- Composite FK to the membership (same pattern as org_attendance): the target
-- is the existing UNIQUE(auth0_org_id, auth0_user_id) on org_members.
alter table "public"."org_leave_balances" add constraint "org_leave_balances_member_fkey"
  foreign key (auth0_org_id, auth0_user_id)
  references public.org_members(auth0_org_id, auth0_user_id) on update cascade on delete cascade not valid;
alter table "public"."org_leave_balances" validate constraint "org_leave_balances_member_fkey";

create unique index org_leave_balances_unique
  on public.org_leave_balances using btree (auth0_org_id, auth0_user_id, leave_type);
create index org_leave_balances_member_idx
  on public.org_leave_balances using btree (auth0_org_id, auth0_user_id);
