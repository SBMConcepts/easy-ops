-- =====================================================================
-- b2b saas multi-tenancy — remote schema (supabase / postgres)
--
-- identity provider : auth0 (custom jwt)
-- tenant key        : auth0_org_id (text, no default, never empty)
-- membership model  : one organization per user
--
-- section order (runs top-to-bottom on a fresh or existing project):
--    0. session guards + migration preflight checks
--    1. extensions
--    2. schemas
--    3. enumerated types
--    4. functions (jwt helpers + trigger functions)
--    5. tables (dependency order, composite tenant fks)
--    6. indexes
--    7. grants
--    8. row level security + policies
--    9. triggers
--   10. storage/scalability tuning
--   11. postflight verification
--   12. legacy migration helpers (commented, destructive)
--
-- re-runnable: types are guarded, policies/triggers are dropped first,
-- everything else uses "if not exists".
--
-- compatibility: postgres 13+ (no pg16-only syntax is used anywhere).
-- =====================================================================

begin;

-- do not let this migration sit on an exclusive lock behind live traffic:
-- fail fast instead of queueing the whole application behind ddl.
set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local idle_in_transaction_session_timeout = '60s';
set local client_min_messages = warning;


-- =====================================================================
-- 0. migration preflight
--
-- every check below aborts the transaction. nothing is half-applied.
-- =====================================================================

do $preflight$
declare
  v_item  text;
  v_count bigint;
begin
  -- 0.1 server version -------------------------------------------------
  if current_setting('server_version_num')::int < 130000 then
    raise exception
      'postgres 13+ required, found %', current_setting('server_version');
  end if;

  -- 0.2 supabase roles -------------------------------------------------
  foreach v_item in array array['authenticated', 'service_role'] loop
    if not exists (select 1 from pg_roles where rolname = v_item) then
      raise exception
        'role % is missing. this file targets a supabase project.', v_item;
    end if;
  end loop;

  -- 0.3 required extensions must be installable ------------------------
  foreach v_item in array array['pgcrypto', 'citext', 'btree_gist'] loop
    if not exists (select 1 from pg_available_extensions where name = v_item) then
      raise exception 'extension % is not available on this server', v_item;
    end if;
  end loop;

  -- 0.4 legacy data that the new constraints would reject --------------
  -- rows stranded in the "empty tenant" (the ''::text default this schema removes)
  if to_regclass('public.users') is not null then
    execute 'select count(*) from public.users where coalesce(auth0_org_id, '''') = ''''' into v_count;
    if v_count > 0 then
      raise exception
        'preflight: % public.users rows have an empty auth0_org_id. reconcile them (section 12.1) before migrating.', v_count;
    end if;
  end if;

  if to_regclass('public.org_members') is not null then
    execute 'select count(*) from public.org_members where coalesce(auth0_org_id, '''') = '''' or coalesce(auth0_user_id, '''') = ''''' into v_count;
    if v_count > 0 then
      raise exception
        'preflight: % public.org_members rows have an empty tenant/user key. reconcile them before migrating.', v_count;
    end if;

    -- one org per user is a hard invariant of this schema
    execute 'select count(*) from (select auth0_user_id from public.org_members group by 1 having count(*) > 1) d' into v_count;
    if v_count > 0 then
      raise exception
        'preflight: % users belong to more than one organization. this schema enforces one org per user.', v_count;
    end if;
  end if;

  if to_regclass('public.org_attendance') is not null then
    execute 'select count(*) from (select auth0_org_id, auth0_user_id, date from public.org_attendance group by 1,2,3 having count(*) > 1) d' into v_count;
    if v_count > 0 then
      raise exception
        'preflight: % duplicate (org, user, date) attendance groups. de-duplicate before the unique key can be added.', v_count;
    end if;
  end if;

  if to_regclass('public.org_leave_balances') is not null then
    execute 'select count(*) from (select auth0_org_id, auth0_user_id, leave_type from public.org_leave_balances group by 1,2,3 having count(*) > 1) d' into v_count;
    if v_count > 0 then
      raise exception
        'preflight: % duplicate (org, user, leave_type) balance groups. de-duplicate first.', v_count;
    end if;
  end if;

  if to_regclass('public.organizations') is not null then
    execute 'select count(*) from (select slug from public.organizations group by 1 having count(*) > 1) d' into v_count;
    if v_count > 0 then
      raise exception 'preflight: % duplicate organization slugs. resolve before the unique key can be added.', v_count;
    end if;
  end if;

  -- 0.5 credentials live in this database (custom-database connection).
  --     user_credentials.password_hash is REQUIRED by the auth0 custom-db
  --     scripts (auth0/database-scripts/*.js) and is therefore retained,
  --     not dropped. it is never exposed through postgrest (a column-level
  --     revoke is applied in section 7).

  raise notice 'preflight passed';
end
$preflight$;


-- =====================================================================
-- 1. extensions
--
-- installed into the dedicated "extensions" schema so they never collide
-- with application objects in public and stay out of the data api.
-- =====================================================================

create schema if not exists extensions;

create extension if not exists pgcrypto   with schema extensions;  -- gen_random_bytes
create extension if not exists citext     with schema extensions;  -- case-insensitive email
create extension if not exists btree_gist with schema extensions;  -- composite exclusion constraints


-- =====================================================================
-- 2. schemas
-- =====================================================================

-- private helper schema: not exposed through the data api, so the jwt
-- helpers below can be security definer without becoming callable rpcs.
create schema if not exists auth0;

revoke all on schema auth0 from public;
grant usage on schema auth0 to authenticated, service_role;


-- =====================================================================
-- 3. enumerated types
--
-- replaces every text+check set and every unresolved user-defined column
-- in the original dump.
-- =====================================================================

do $types$
declare
  v_type text;
  v_defs text[][] := array[
    ['org_plan',                 $$'free','starter','growth','pro','enterprise'$$],
    ['org_status',               $$'provisioning','active','suspended','cancelled'$$],
    ['org_role',                 $$'owner','admin','manager','member'$$],
    ['member_status',            $$'active','suspended'$$],
    ['employment_type',          $$'permanent','contract','part_time','temporary','shift_worker'$$],
    ['identification_type',      $$'sa_id','passport'$$],
    ['credential_status',        $$'active','blocked','deleted'$$],
    ['subscription_status',      $$'trialing','active','past_due','cancelled'$$],
    ['leave_type',               $$'annual','sick','family_responsibility'$$],
    ['attendance_method',        $$'whatsapp','biometric','ussd','qr'$$],
    ['forecast_alert_type',      $$'understaffed','overstaffed','overtime_risk','absence_spike','coverage_gap'$$],
    ['forecast_alert_severity',  $$'low','medium','high','critical'$$],
    ['forecast_alert_status',    $$'open','acknowledged','resolved','dismissed'$$],
    ['support_ticket_category',  $$'general','billing','technical','onboarding','feature_request','bug'$$],
    ['support_ticket_priority',  $$'low','medium','high','urgent'$$],
    ['support_ticket_status',    $$'open','pending','in_progress','resolved','closed'$$],
    ['support_message_author',   $$'customer','agent','system'$$],
    ['incident_type',            $$'injury','near_miss','property_damage','environmental','security','vehicle','other'$$],
    ['incident_severity',        $$'minor','moderate','serious','fatal'$$],
    ['incident_status',          $$'open','under_review','closed'$$],
    ['payroll_export_format',    $$'csv','xlsx','sage','pastel','xero','custom'$$]
  ];
  i int;
begin
  for i in 1 .. array_length(v_defs, 1) loop
    v_type := v_defs[i][1];
    if not exists (
      select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = v_type
    ) then
      execute format('create type public.%I as enum (%s)', v_type, v_defs[i][2]);
    end if;
  end loop;
end
$types$;


-- =====================================================================
-- 4. functions
-- =====================================================================

-- ---------------------------------------------------------------------
-- 4a. auth0 jwt claim helpers
--
-- every rls policy routes through these. swapping identity providers
-- later means rewriting two readers, not eighty policies.
--
-- all of them are stable so postgres can hoist them into an initplan and
-- evaluate them once per statement instead of once per row (the policies
-- additionally wrap each call in a scalar subquery to force this).
-- ---------------------------------------------------------------------

create or replace function auth0.jwt()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

comment on function auth0.jwt() is
  'decoded auth0 jwt claims for the current request, or {} when unauthenticated';

-- auth0 puts the organization on "org_id"; namespaced action-injected
-- claims are also accepted so a custom claim needs no schema change.
create or replace function auth0.current_org_id()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(
    coalesce(
      auth0.jwt() ->> 'org_id',
      auth0.jwt() ->> 'https://app.example.com/org_id',
      auth0.jwt() -> 'app_metadata' ->> 'org_id'
    ),
    ''
  );
$$;

create or replace function auth0.current_user_id()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(auth0.jwt() ->> 'sub', '');
$$;

-- security definer: this reads org_members from inside policies that are
-- themselves defined on org_members. without definer it recurses.
-- written in plpgsql so the body is not parsed at create time — the
-- function is defined before public.org_members exists.
create or replace function auth0.current_role()
returns public.org_role
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role public.org_role;
begin
  select m.role
    into v_role
    from public.org_members m
   where m.auth0_user_id = auth0.current_user_id()
     and m.auth0_org_id  = auth0.current_org_id()
     and m.status = 'active'
   limit 1;

  return v_role;
end;
$$;

create or replace function auth0.is_org_member()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth0.current_role() is not null;
$$;

create or replace function auth0.is_org_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth0.current_role() in ('owner', 'admin');
$$;

create or replace function auth0.is_org_manager()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth0.current_role() in ('owner', 'admin', 'manager');
$$;

revoke all on function
  auth0.jwt(),
  auth0.current_org_id(),
  auth0.current_user_id(),
  auth0.current_role(),
  auth0.is_org_member(),
  auth0.is_org_admin(),
  auth0.is_org_manager()
from public;

grant execute on function
  auth0.jwt(),
  auth0.current_org_id(),
  auth0.current_user_id(),
  auth0.current_role(),
  auth0.is_org_member(),
  auth0.is_org_admin(),
  auth0.is_org_manager()
to authenticated, service_role;


-- ---------------------------------------------------------------------
-- 4b. trigger functions
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- one org per user: keep users.auth0_org_id from drifting away from the
-- membership row that actually defines the tenancy.
create or replace function public.sync_member_org()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users u
     set auth0_org_id = new.auth0_org_id
   where u.auth0_user_id = new.auth0_user_id
     and u.auth0_org_id is distinct from new.auth0_org_id;

  return new;
end;
$$;

-- audit rows are append-only and must carry the caller's real identity,
-- never a client-supplied one.
create or replace function public.guard_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth0.current_user_id() is not null then
    new.auth0_user_id := auth0.current_user_id();
    new.auth0_org_id  := auth0.current_org_id();
  end if;

  return new;
end;
$$;

-- support ticket sla stamping, derived from priority at creation time.
create or replace function public.set_ticket_sla()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sla_response_due is null then
    new.sla_response_due := new.created_at + case new.priority
      when 'urgent' then interval '1 hour'
      when 'high'   then interval '4 hours'
      when 'medium' then interval '1 day'
      else               interval '3 days'
    end;
  end if;

  if new.sla_resolution_due is null then
    new.sla_resolution_due := new.created_at + case new.priority
      when 'urgent' then interval '8 hours'
      when 'high'   then interval '2 days'
      when 'medium' then interval '5 days'
      else               interval '10 days'
    end;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- tenant-safe "set null" on parent delete.
--
-- postgres cannot express "on delete set null (child_col)" before v16,
-- and a bare "on delete set null" on a composite tenant fk would null
-- auth0_org_id too — destroying the tenant key of the surviving row.
--
-- instead the fks below are declared "on delete no action" and this
-- before-delete trigger clears only the optional reference column, in
-- the same tenant, before the referential check runs.
--
-- tg_argv: [0] child table, [1] child column, [2] parent key column
-- ---------------------------------------------------------------------
create or replace function public.tenant_null_child_ref()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_child_table text := tg_argv[0];
  v_child_col   text := tg_argv[1];
  v_parent_key  text := tg_argv[2];
  v_key_value   text := to_jsonb(old) ->> tg_argv[2];
begin
  if v_key_value is null then
    return old;
  end if;

  execute format(
    'update public.%I set %I = null where %I::text = $1 and auth0_org_id = $2',
    v_child_table, v_child_col, v_child_col
  )
  using v_key_value, old.auth0_org_id;

  return old;
end;
$$;


-- =====================================================================
-- 5. tables
--
-- tenancy invariants applied to every table:
--   * auth0_org_id has no default and is check-constrained non-empty.
--     a tenant key must never be implicit.
--   * every parent carries unique (id, auth0_org_id) so children can use
--     composite foreign keys. cross-tenant references then become
--     impossible at the storage layer, independent of rls correctness.
-- =====================================================================

-- ---------------------------------------------------------------------
-- organizations — tenant root
-- ---------------------------------------------------------------------
create table if not exists public.organizations (
  auth0_org_id text primary key
                 constraint organizations_org_id_chk check (length(auth0_org_id) > 0),
  name         text not null constraint organizations_name_chk check (length(btrim(name)) > 0),
  slug         text not null,
  plan         public.org_plan   not null default 'free',
  status       public.org_status not null default 'active',
  industry     text  not null default '',
  country      text  not null default '',
  logo_url     text  not null default '',
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint organizations_slug_key unique (slug),
  constraint organizations_slug_chk check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

comment on table public.organizations is 'tenant root. auth0_org_id is the tenant key for the entire schema.';

-- ---------------------------------------------------------------------
-- users — canonical identity/profile
--
-- the original dump had users <-> user_credentials in a foreign key
-- cycle. the cycle is broken by making users the parent of both
-- user_credentials and org_members.
-- ---------------------------------------------------------------------
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  auth0_user_id text not null constraint users_user_id_chk check (length(auth0_user_id) > 0),
  auth0_org_id  text not null constraint users_org_id_chk  check (length(auth0_org_id) > 0),
  email         extensions.citext not null,
  full_name     text not null default '',
  first_name    text not null default '',
  last_name     text not null default '',
  avatar_url    text,
  mobile_number text,
  national_id   text,
  id_type       public.identification_type,
  address       text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint users_auth0_user_id_key unique (auth0_user_id),
  constraint users_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade,
  -- email is unique per tenant, not globally: the same human may exist as
  -- a contact in two customer orgs even though they log in to only one.
  constraint users_org_email_key unique (auth0_org_id, email),
  constraint users_id_org_key    unique (id, auth0_org_id),
  constraint users_user_org_key  unique (auth0_user_id, auth0_org_id),
  -- a national id only makes sense together with its type
  constraint users_id_type_chk check (
    (national_id is null and id_type is null)
    or (national_id is not null and id_type is not null)
  )
);

-- ---------------------------------------------------------------------
-- user_credentials — credential store for the auth0 custom-database
-- connection (auth0/database-scripts/*.js authenticate against this table).
--
-- password_hash (bcrypt) is stored here because auth0's custom-db login
-- delegates verification to this database. it is NEVER exposed through the
-- postgrest data api: section 7 revokes column-level select from the
-- authenticated role, so only the service_role / pooler (which the scripts
-- and the express layer use) can read it.
-- ---------------------------------------------------------------------
create table if not exists public.user_credentials (
  id             uuid primary key default gen_random_uuid(),
  auth0_user_id  text not null constraint user_credentials_user_id_chk check (length(auth0_user_id) > 0),
  auth0_org_id   text not null constraint user_credentials_org_id_chk  check (length(auth0_org_id) > 0),
  email          extensions.citext not null,
  password_hash  text,
  email_verified boolean not null default false,
  status         public.credential_status not null default 'active',
  last_synced_at timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint user_credentials_auth0_user_id_key unique (auth0_user_id),
  constraint user_credentials_user_fkey foreign key (auth0_user_id, auth0_org_id)
    references public.users (auth0_user_id, auth0_org_id) on delete cascade
);

-- ---------------------------------------------------------------------
-- org_departments
-- ---------------------------------------------------------------------
create table if not exists public.org_departments (
  id              uuid primary key default gen_random_uuid(),
  auth0_org_id    text not null constraint org_departments_org_id_chk check (length(auth0_org_id) > 0),
  department_name text not null constraint org_departments_name_chk   check (length(btrim(department_name)) > 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint org_departments_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade,
  constraint org_departments_id_org_key unique (id, auth0_org_id),
  constraint org_departments_name_key   unique (auth0_org_id, department_name)
);

-- ---------------------------------------------------------------------
-- org_sites — geofenced work locations
-- ---------------------------------------------------------------------
create table if not exists public.org_sites (
  id            uuid primary key default gen_random_uuid(),
  auth0_org_id  text not null constraint org_sites_org_id_chk check (length(auth0_org_id) > 0),
  department_id uuid not null,
  site_name     text not null constraint org_sites_name_chk check (length(btrim(site_name)) > 0),
  address       text not null default '',
  latitude      double precision not null constraint org_sites_lat_chk check (latitude between -90 and 90),
  longitude     double precision not null constraint org_sites_lng_chk check (longitude between -180 and 180),
  geo_radius_m  numeric(10,2) not null default 100
                  constraint org_sites_radius_chk check (geo_radius_m > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint org_sites_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade,
  -- composite: a site cannot point at another tenant's department
  constraint org_sites_department_fkey foreign key (department_id, auth0_org_id)
    references public.org_departments (id, auth0_org_id) on delete restrict,
  constraint org_sites_id_org_key unique (id, auth0_org_id),
  constraint org_sites_name_key   unique (auth0_org_id, site_name)
);

-- ---------------------------------------------------------------------
-- org_roles — tenant-defined job roles mapped onto a base permission role
-- ---------------------------------------------------------------------
create table if not exists public.org_roles (
  id           uuid primary key default gen_random_uuid(),
  auth0_org_id text not null constraint org_roles_org_id_chk check (length(auth0_org_id) > 0),
  name         text not null constraint org_roles_name_chk   check (length(btrim(name)) > 0),
  base_role    public.org_role,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint org_roles_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade,
  constraint org_roles_id_org_key unique (id, auth0_org_id),
  constraint org_roles_name_key   unique (auth0_org_id, name)
);

-- ---------------------------------------------------------------------
-- org_shifts
--
-- start_time = end_time is rejected; start > end is allowed and means an
-- overnight shift.
-- ---------------------------------------------------------------------
create table if not exists public.org_shifts (
  id                   uuid primary key default gen_random_uuid(),
  auth0_org_id         text not null constraint org_shifts_org_id_chk check (length(auth0_org_id) > 0),
  shift_name           text not null constraint org_shifts_name_chk   check (length(btrim(shift_name)) > 0),
  start_time           time not null,
  end_time             time not null,
  grace_period_minutes integer not null default 0
                         constraint org_shifts_grace_chk check (grace_period_minutes between 0 and 240),
  weekly_hours         numeric(6,2)
                         constraint org_shifts_weekly_hours_chk check (weekly_hours is null or weekly_hours between 0 and 168),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint org_shifts_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade,
  constraint org_shifts_id_org_key unique (id, auth0_org_id),
  constraint org_shifts_name_key   unique (auth0_org_id, shift_name),
  constraint org_shifts_time_chk   check (start_time <> end_time)
);

-- ---------------------------------------------------------------------
-- org_members — the membership + employment record.
--
-- one org per user: auth0_user_id stays globally unique.
-- optional references use "on delete no action" plus the tenant-safe
-- null-out trigger (section 9) so the tenant key survives parent deletes.
-- ---------------------------------------------------------------------
create table if not exists public.org_members (
  id              uuid primary key default gen_random_uuid(),
  auth0_org_id    text not null constraint org_members_org_id_chk  check (length(auth0_org_id) > 0),
  auth0_user_id   text not null constraint org_members_user_id_chk check (length(auth0_user_id) > 0),
  role            public.org_role      not null default 'member',
  status          public.member_status not null default 'active',
  department_id   uuid,
  site_id         uuid,
  job_role_id     uuid,
  shift_id        uuid,
  manager_id      uuid,
  employee_code   text,
  employment_type public.employment_type,
  hourly_rate     numeric(12,2) constraint org_members_rate_chk check (hourly_rate is null or hourly_rate >= 0),
  tax_number      text,
  joined_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint org_members_auth0_user_id_key unique (auth0_user_id),
  -- identity resolves against users (the canonical table), not
  -- user_credentials — this is what broke the original fk cycle.
  constraint org_members_user_fkey foreign key (auth0_user_id, auth0_org_id)
    references public.users (auth0_user_id, auth0_org_id) on delete cascade,
  constraint org_members_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade,
  constraint org_members_department_fkey foreign key (department_id, auth0_org_id)
    references public.org_departments (id, auth0_org_id) on delete no action,
  constraint org_members_site_fkey foreign key (site_id, auth0_org_id)
    references public.org_sites (id, auth0_org_id) on delete no action,
  constraint org_members_job_role_fkey foreign key (job_role_id, auth0_org_id)
    references public.org_roles (id, auth0_org_id) on delete no action,
  constraint org_members_shift_fkey foreign key (shift_id, auth0_org_id)
    references public.org_shifts (id, auth0_org_id) on delete no action,
  -- self-reference, tenant-contained: a manager must be in the same org
  constraint org_members_manager_fkey foreign key (manager_id, auth0_org_id)
    references public.org_members (id, auth0_org_id) on delete no action,
  constraint org_members_no_self_manage check (manager_id is distinct from id),
  -- targets for every composite fk pointing at a member
  constraint org_members_id_org_key        unique (id, auth0_org_id),
  constraint org_members_user_org_key      unique (auth0_org_id, auth0_user_id),
  constraint org_members_employee_code_key unique (auth0_org_id, employee_code)
);

-- ---------------------------------------------------------------------
-- subscriptions — at most one non-terminal subscription per org
-- ---------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  auth0_org_id       text not null constraint subscriptions_org_id_chk check (length(auth0_org_id) > 0),
  plan               public.org_plan not null,
  status             public.subscription_status not null default 'trialing',
  trial_ends_at      timestamptz,
  current_period_end timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint subscriptions_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade
);

create unique index if not exists subscriptions_one_live_per_org
  on public.subscriptions (auth0_org_id)
  where status in ('trialing', 'active', 'past_due');

-- ---------------------------------------------------------------------
-- invitations
-- ---------------------------------------------------------------------
create table if not exists public.invitations (
  id                 uuid primary key default gen_random_uuid(),
  auth0_org_id       text not null constraint invitations_org_id_chk check (length(auth0_org_id) > 0),
  email              extensions.citext not null,
  role               public.org_role not null default 'member',
  token              text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  invited_by         text,
  expires_at         timestamptz not null default (now() + interval '7 days'),
  accepted_at        timestamptz,
  accepted_member_id uuid,
  revoked_at         timestamptz,
  created_at         timestamptz not null default now(),
  constraint invitations_token_key unique (token),
  constraint invitations_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade,
  constraint invitations_inviter_fkey foreign key (invited_by, auth0_org_id)
    references public.org_members (auth0_user_id, auth0_org_id) on delete no action,
  -- closes the loop: an accepted invite names the member it produced
  constraint invitations_member_fkey foreign key (accepted_member_id, auth0_org_id)
    references public.org_members (id, auth0_org_id) on delete no action,
  constraint invitations_accept_chk check (
    (accepted_at is null and accepted_member_id is null)
    or (accepted_at is not null and accepted_member_id is not null)
  )
);

-- only one *pending* invite per (org, email); historical ones may repeat
create unique index if not exists invitations_pending_unique
  on public.invitations (auth0_org_id, email)
  where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------
-- audit_logs — append-only, highest-growth table in the schema
-- ---------------------------------------------------------------------
create table if not exists public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  auth0_org_id  text not null constraint audit_logs_org_id_chk  check (length(auth0_org_id) > 0),
  auth0_user_id text not null constraint audit_logs_user_id_chk check (length(auth0_user_id) > 0),
  action        text not null constraint audit_logs_action_chk  check (length(btrim(action)) > 0),
  resource_type text,
  resource_id   text,
  diff          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  constraint audit_logs_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade,
  constraint audit_logs_actor_fkey foreign key (auth0_user_id, auth0_org_id)
    references public.users (auth0_user_id, auth0_org_id) on delete restrict
);

-- ---------------------------------------------------------------------
-- org_attendance — one row per member per day
-- ---------------------------------------------------------------------
create table if not exists public.org_attendance (
  id            uuid primary key default gen_random_uuid(),
  auth0_org_id  text not null constraint org_attendance_org_id_chk  check (length(auth0_org_id) > 0),
  auth0_user_id text not null constraint org_attendance_user_id_chk check (length(auth0_user_id) > 0),
  date          date not null,
  method        public.attendance_method not null,
  hours_worked  numeric(6,2) not null default 0
                  constraint org_attendance_hours_chk check (hours_worked between 0 and 24),
  overtime      numeric(6,2) not null default 0
                  constraint org_attendance_overtime_chk check (overtime between 0 and 24),
  department_id uuid,
  site_id       uuid,
  created_at    timestamptz not null default now(),  -- was timestamp without time zone
  updated_at    timestamptz not null default now(),
  -- one composite fk replaces the two duplicate-named, invalid fks
  constraint org_attendance_member_fkey foreign key (auth0_org_id, auth0_user_id)
    references public.org_members (auth0_org_id, auth0_user_id) on delete cascade,
  constraint org_attendance_department_fkey foreign key (department_id, auth0_org_id)
    references public.org_departments (id, auth0_org_id) on delete no action,
  constraint org_attendance_site_fkey foreign key (site_id, auth0_org_id)
    references public.org_sites (id, auth0_org_id) on delete no action,
  constraint org_attendance_day_key unique (auth0_org_id, auth0_user_id, date)
);

-- ---------------------------------------------------------------------
-- org_leave_balances
-- ---------------------------------------------------------------------
create table if not exists public.org_leave_balances (
  id            uuid primary key default gen_random_uuid(),
  auth0_org_id  text not null constraint org_leave_balances_org_id_chk  check (length(auth0_org_id) > 0),
  auth0_user_id text not null constraint org_leave_balances_user_id_chk check (length(auth0_user_id) > 0),
  leave_type    public.leave_type not null,
  balance_days  numeric(6,2) not null default 0,
  updated_at    timestamptz not null default now(),
  -- one composite fk replaces the two duplicate-named, invalid fks
  constraint org_leave_balances_member_fkey foreign key (auth0_org_id, auth0_user_id)
    references public.org_members (auth0_org_id, auth0_user_id) on delete cascade,
  constraint org_leave_balances_key unique (auth0_org_id, auth0_user_id, leave_type)
);

-- ---------------------------------------------------------------------
-- labour_forecasts
-- ---------------------------------------------------------------------
create table if not exists public.labour_forecasts (
  id                       uuid primary key default gen_random_uuid(),
  auth0_org_id             text not null constraint labour_forecasts_org_id_chk check (length(auth0_org_id) > 0),
  site_id                  uuid,
  forecast_date            date not null,
  horizon_days             integer not null default 7
                             constraint labour_forecasts_horizon_chk check (horizon_days between 1 and 365),
  predicted_required_staff integer
                             constraint labour_forecasts_staff_chk check (predicted_required_staff is null or predicted_required_staff >= 0),
  predicted_hours          numeric(10,2)
                             constraint labour_forecasts_hours_chk check (predicted_hours is null or predicted_hours >= 0),
  demand_score             numeric(5,2),
  confidence               numeric(5,4)
                             constraint labour_forecasts_confidence_chk check (confidence is null or confidence between 0 and 1),
  model                    text,
  reasoning                text,
  input_summary            jsonb not null default '{}'::jsonb,
  generated_by             text,
  created_at               timestamptz not null default now(),
  constraint labour_forecasts_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade,
  constraint labour_forecasts_site_fkey foreign key (site_id, auth0_org_id)
    references public.org_sites (id, auth0_org_id) on delete cascade,
  constraint labour_forecasts_generator_fkey foreign key (generated_by, auth0_org_id)
    references public.org_members (auth0_user_id, auth0_org_id) on delete no action,
  constraint labour_forecasts_id_org_key unique (id, auth0_org_id)
);

-- ---------------------------------------------------------------------
-- labour_alerts
-- ---------------------------------------------------------------------
create table if not exists public.labour_alerts (
  id                 uuid primary key default gen_random_uuid(),
  auth0_org_id       text not null constraint labour_alerts_org_id_chk  check (length(auth0_org_id) > 0),
  forecast_id        uuid,
  site_id            uuid not null,
  auth0_user_id      text not null constraint labour_alerts_user_id_chk check (length(auth0_user_id) > 0),
  alert_type         public.forecast_alert_type     not null,
  severity           public.forecast_alert_severity not null default 'medium',
  status             public.forecast_alert_status   not null default 'open',
  target_date        date,
  title              text not null constraint labour_alerts_title_chk check (length(btrim(title)) > 0),
  detail             text,
  recommended_action text,
  metrics            jsonb not null default '{}'::jsonb,
  acknowledged_by    text,
  acknowledged_at    timestamptz,
  resolved_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint labour_alerts_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade,
  constraint labour_alerts_forecast_fkey foreign key (forecast_id, auth0_org_id)
    references public.labour_forecasts (id, auth0_org_id) on delete cascade,
  constraint labour_alerts_site_fkey foreign key (site_id, auth0_org_id)
    references public.org_sites (id, auth0_org_id) on delete cascade,
  -- originally pointed at user_credentials; now the membership record
  constraint labour_alerts_member_fkey foreign key (auth0_user_id, auth0_org_id)
    references public.org_members (auth0_user_id, auth0_org_id) on delete cascade,
  constraint labour_alerts_ack_fkey foreign key (acknowledged_by, auth0_org_id)
    references public.org_members (auth0_user_id, auth0_org_id) on delete no action,
  constraint labour_alerts_ack_chk check (
    status <> 'acknowledged' or acknowledged_at is not null
  )
);

-- ---------------------------------------------------------------------
-- payroll_export_runs — south african payroll (paye / uif)
-- ---------------------------------------------------------------------
create table if not exists public.payroll_export_runs (
  id             uuid primary key default gen_random_uuid(),
  auth0_org_id   text not null constraint payroll_export_runs_org_id_chk check (length(auth0_org_id) > 0),
  period_start   date not null,
  period_end     date not null,
  format         public.payroll_export_format not null default 'csv',
  employee_count integer       not null default 0 constraint payroll_export_runs_count_chk check (employee_count >= 0),
  gross_total    numeric(14,2) not null default 0 constraint payroll_export_runs_gross_chk check (gross_total >= 0),
  paye_total     numeric(14,2) not null default 0 constraint payroll_export_runs_paye_chk  check (paye_total  >= 0),
  uif_total      numeric(14,2) not null default 0 constraint payroll_export_runs_uif_chk   check (uif_total   >= 0),
  net_total      numeric(14,2) not null default 0 constraint payroll_export_runs_net_chk   check (net_total   >= 0),
  generated_by   text,
  created_at     timestamptz not null default now(),
  constraint payroll_export_runs_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade,
  constraint payroll_export_runs_generator_fkey foreign key (generated_by, auth0_org_id)
    references public.org_members (auth0_user_id, auth0_org_id) on delete no action,
  constraint payroll_export_runs_period_chk check (period_end >= period_start)
);

-- ---------------------------------------------------------------------
-- support_tickets
-- ---------------------------------------------------------------------
create table if not exists public.support_tickets (
  id                 uuid primary key default gen_random_uuid(),
  auth0_org_id       text not null constraint support_tickets_org_id_chk  check (length(auth0_org_id) > 0),
  subject            text not null constraint support_tickets_subject_chk check (length(btrim(subject)) > 0),
  description        text,
  category           public.support_ticket_category not null default 'general',
  priority           public.support_ticket_priority not null default 'medium',
  status             public.support_ticket_status   not null default 'open',
  plan_at_creation   public.org_plan,
  sla_response_due   timestamptz,
  sla_resolution_due timestamptz,
  first_response_at  timestamptz,
  resolved_at        timestamptz,
  closed_at          timestamptz,
  created_by         text,
  assigned_to        text,  -- internal agent id; not a tenant member
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint support_tickets_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade,
  constraint support_tickets_creator_fkey foreign key (created_by, auth0_org_id)
    references public.org_members (auth0_user_id, auth0_org_id) on delete no action,
  constraint support_tickets_id_org_key unique (id, auth0_org_id),
  constraint support_tickets_closed_chk check (
    status <> 'closed' or closed_at is not null
  )
);

-- ---------------------------------------------------------------------
-- support_messages
-- ---------------------------------------------------------------------
create table if not exists public.support_messages (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null,
  auth0_org_id text not null constraint support_messages_org_id_chk check (length(auth0_org_id) > 0),
  author_id    text,
  author_role  public.support_message_author not null default 'customer',
  body         text not null constraint support_messages_body_chk check (length(btrim(body)) > 0),
  is_internal  boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint support_messages_ticket_fkey foreign key (ticket_id, auth0_org_id)
    references public.support_tickets (id, auth0_org_id) on delete cascade,
  constraint support_messages_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade
);

-- ---------------------------------------------------------------------
-- csm_assignments — one customer success manager per org
-- ---------------------------------------------------------------------
create table if not exists public.csm_assignments (
  id           uuid primary key default gen_random_uuid(),
  auth0_org_id text not null constraint csm_assignments_org_id_chk check (length(auth0_org_id) > 0),
  csm_name     text not null constraint csm_assignments_name_chk   check (length(btrim(csm_name)) > 0),
  csm_email    extensions.citext not null,
  csm_phone    text,
  csm_title    text,
  calendar_url text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint csm_assignments_org_key unique (auth0_org_id),
  constraint csm_assignments_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade
);

-- ---------------------------------------------------------------------
-- safety_checklist_templates
-- ---------------------------------------------------------------------
create table if not exists public.safety_checklist_templates (
  id                      uuid primary key default gen_random_uuid(),
  auth0_org_id            text not null constraint safety_templates_org_id_chk check (length(auth0_org_id) > 0),
  name                    text not null constraint safety_templates_name_chk   check (length(btrim(name)) > 0),
  description             text,
  items                   jsonb not null default '[]'::jsonb
                            constraint safety_templates_items_chk check (jsonb_typeof(items) = 'array'),
  required_at_shift_start boolean not null default true,
  active                  boolean not null default true,
  created_by              text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint safety_templates_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade,
  constraint safety_templates_creator_fkey foreign key (created_by, auth0_org_id)
    references public.org_members (auth0_user_id, auth0_org_id) on delete no action,
  constraint safety_templates_id_org_key unique (id, auth0_org_id),
  constraint safety_templates_name_key   unique (auth0_org_id, name)
);

-- ---------------------------------------------------------------------
-- safety_checklist_responses — signed, immutable evidence
-- ---------------------------------------------------------------------
create table if not exists public.safety_checklist_responses (
  id             uuid primary key default gen_random_uuid(),
  auth0_org_id   text not null constraint safety_responses_org_id_chk  check (length(auth0_org_id) > 0),
  template_id    uuid not null,
  auth0_user_id  text not null constraint safety_responses_user_id_chk check (length(auth0_user_id) > 0),  -- was untyped user_id
  shift_id       uuid,
  site_id        uuid,
  responses      jsonb not null default '[]'::jsonb
                   constraint safety_responses_payload_chk check (jsonb_typeof(responses) = 'array'),
  passed         boolean not null default true,
  notes          text,
  signature_data text not null constraint safety_responses_signature_chk check (length(signature_data) > 0),
  signed_at      timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  constraint safety_responses_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade,
  constraint safety_responses_template_fkey foreign key (template_id, auth0_org_id)
    references public.safety_checklist_templates (id, auth0_org_id) on delete restrict,
  constraint safety_responses_member_fkey foreign key (auth0_user_id, auth0_org_id)
    references public.org_members (auth0_user_id, auth0_org_id) on delete cascade,
  constraint safety_responses_shift_fkey foreign key (shift_id, auth0_org_id)
    references public.org_shifts (id, auth0_org_id) on delete no action,
  constraint safety_responses_site_fkey foreign key (site_id, auth0_org_id)
    references public.org_sites (id, auth0_org_id) on delete no action
);

-- ---------------------------------------------------------------------
-- incident_reports
--
-- note: columns below the reporter block are the manager countersign
-- block of the SAME table — manager_user_id / manager_signature /
-- manager_signed_at / manager_notes. there is no separate manager table.
-- ---------------------------------------------------------------------
create table if not exists public.incident_reports (
  id                 uuid primary key default gen_random_uuid(),
  auth0_org_id       text not null constraint incident_reports_org_id_chk   check (length(auth0_org_id) > 0),
  reporter_id        text not null constraint incident_reports_reporter_chk check (length(reporter_id) > 0),
  site_id            uuid,
  department_id      uuid,
  incident_type      public.incident_type     not null,
  severity           public.incident_severity not null,
  status             public.incident_status   not null default 'open',
  occurred_at        timestamptz not null default now(),
  description        text not null constraint incident_reports_description_chk check (length(btrim(description)) > 0),
  actions_taken      text,
  witnesses          text,
  photos             jsonb not null default '[]'::jsonb
                       constraint incident_reports_photos_chk check (jsonb_typeof(photos) = 'array'),
  reporter_signature text not null constraint incident_reports_signature_chk check (length(reporter_signature) > 0),
  reporter_signed_at timestamptz not null default now(),
  -- manager countersign block (same table). was `text` in the original
  -- dump while org_members.manager_id is uuid; unified here as the
  -- manager's auth0_user_id so it fks to the membership record.
  manager_user_id    text,
  manager_signature  text,
  manager_signed_at  timestamptz,
  manager_notes      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint incident_reports_org_fkey foreign key (auth0_org_id)
    references public.organizations (auth0_org_id) on delete cascade,
  constraint incident_reports_reporter_fkey foreign key (reporter_id, auth0_org_id)
    references public.org_members (auth0_user_id, auth0_org_id) on delete restrict,
  constraint incident_reports_manager_fkey foreign key (manager_user_id, auth0_org_id)
    references public.org_members (auth0_user_id, auth0_org_id) on delete no action,
  constraint incident_reports_site_fkey foreign key (site_id, auth0_org_id)
    references public.org_sites (id, auth0_org_id) on delete no action,
  constraint incident_reports_department_fkey foreign key (department_id, auth0_org_id)
    references public.org_departments (id, auth0_org_id) on delete no action,
  constraint incident_reports_manager_sign_chk check (
    (manager_signature is null and manager_signed_at is null)
    or (manager_signature is not null and manager_signed_at is not null and manager_user_id is not null)
  )
);


-- =====================================================================
-- 6. indexes
--
-- the original schema had none. every rls predicate filters on
-- auth0_org_id, so without these each policy evaluation is a seq scan.
--
-- rules applied:
--   * leading column is always the tenant key (rls filters on it first)
--   * every foreign key child column is indexed, otherwise parent
--     deletes take a full scan per child table
--   * hot list views get a composite (tenant, sort column desc)
--   * append-only time series also get a brin index: ~1000x smaller than
--     a btree and enough for retention/range scans at high row counts
-- =====================================================================

create index if not exists idx_users_org                 on public.users (auth0_org_id);
create index if not exists idx_users_org_email           on public.users (auth0_org_id, email);
create index if not exists idx_user_credentials_org      on public.user_credentials (auth0_org_id);

create index if not exists idx_departments_org           on public.org_departments (auth0_org_id);
create index if not exists idx_sites_org                 on public.org_sites (auth0_org_id);
create index if not exists idx_sites_department          on public.org_sites (department_id, auth0_org_id);
create index if not exists idx_roles_org                 on public.org_roles (auth0_org_id);
create index if not exists idx_shifts_org                on public.org_shifts (auth0_org_id);

create index if not exists idx_members_org               on public.org_members (auth0_org_id);
create index if not exists idx_members_org_status        on public.org_members (auth0_org_id, status);
create index if not exists idx_members_department        on public.org_members (department_id, auth0_org_id);
create index if not exists idx_members_site              on public.org_members (site_id, auth0_org_id);
create index if not exists idx_members_shift             on public.org_members (shift_id, auth0_org_id);
create index if not exists idx_members_job_role          on public.org_members (job_role_id, auth0_org_id);
create index if not exists idx_members_manager           on public.org_members (manager_id, auth0_org_id);

create index if not exists idx_subscriptions_org         on public.subscriptions (auth0_org_id);

create index if not exists idx_invitations_org           on public.invitations (auth0_org_id);
create index if not exists idx_invitations_email         on public.invitations (auth0_org_id, email);
create index if not exists idx_invitations_inviter       on public.invitations (invited_by, auth0_org_id);
create index if not exists idx_invitations_member        on public.invitations (accepted_member_id, auth0_org_id);
-- expiry sweeps only ever look at live invites
create index if not exists idx_invitations_expiring      on public.invitations (expires_at)
  where accepted_at is null and revoked_at is null;

create index if not exists idx_audit_org_created         on public.audit_logs (auth0_org_id, created_at desc);
create index if not exists idx_audit_actor               on public.audit_logs (auth0_user_id, auth0_org_id);
create index if not exists idx_audit_resource            on public.audit_logs (auth0_org_id, resource_type, resource_id);
create index if not exists idx_audit_created_brin        on public.audit_logs using brin (created_at)
  with (pages_per_range = 32);

create index if not exists idx_attendance_org_date       on public.org_attendance (auth0_org_id, date desc);
create index if not exists idx_attendance_member_date    on public.org_attendance (auth0_org_id, auth0_user_id, date desc);
create index if not exists idx_attendance_site           on public.org_attendance (site_id, auth0_org_id);
create index if not exists idx_attendance_department     on public.org_attendance (department_id, auth0_org_id);
create index if not exists idx_attendance_date_brin      on public.org_attendance using brin (date)
  with (pages_per_range = 32);

create index if not exists idx_leave_balances_member     on public.org_leave_balances (auth0_org_id, auth0_user_id);

create index if not exists idx_forecasts_org_date        on public.labour_forecasts (auth0_org_id, forecast_date desc);
create index if not exists idx_forecasts_site            on public.labour_forecasts (site_id, auth0_org_id);
create index if not exists idx_forecasts_generator       on public.labour_forecasts (generated_by, auth0_org_id);

create index if not exists idx_alerts_org_status         on public.labour_alerts (auth0_org_id, status);
create index if not exists idx_alerts_org_open           on public.labour_alerts (auth0_org_id, created_at desc)
  where status = 'open';
create index if not exists idx_alerts_member             on public.labour_alerts (auth0_org_id, auth0_user_id);
create index if not exists idx_alerts_forecast           on public.labour_alerts (forecast_id, auth0_org_id);
create index if not exists idx_alerts_site               on public.labour_alerts (site_id, auth0_org_id);
create index if not exists idx_alerts_ack                on public.labour_alerts (acknowledged_by, auth0_org_id);

create index if not exists idx_payroll_org_period        on public.payroll_export_runs (auth0_org_id, period_start desc);
create index if not exists idx_payroll_generator         on public.payroll_export_runs (generated_by, auth0_org_id);

create index if not exists idx_tickets_org_status        on public.support_tickets (auth0_org_id, status);
create index if not exists idx_tickets_org_created       on public.support_tickets (auth0_org_id, created_at desc);
create index if not exists idx_tickets_creator           on public.support_tickets (created_by, auth0_org_id);
-- sla breach sweeps only care about unresolved tickets
create index if not exists idx_tickets_sla_open          on public.support_tickets (sla_resolution_due)
  where status not in ('resolved', 'closed');

create index if not exists idx_messages_ticket           on public.support_messages (ticket_id, created_at);
create index if not exists idx_messages_org              on public.support_messages (auth0_org_id);

create index if not exists idx_safety_templates_org      on public.safety_checklist_templates (auth0_org_id);
create index if not exists idx_safety_templates_active   on public.safety_checklist_templates (auth0_org_id)
  where active;
create index if not exists idx_safety_templates_creator  on public.safety_checklist_templates (created_by, auth0_org_id);

create index if not exists idx_safety_responses_org      on public.safety_checklist_responses (auth0_org_id, signed_at desc);
create index if not exists idx_safety_responses_member   on public.safety_checklist_responses (auth0_org_id, auth0_user_id);
create index if not exists idx_safety_responses_template on public.safety_checklist_responses (template_id, auth0_org_id);
create index if not exists idx_safety_responses_shift    on public.safety_checklist_responses (shift_id, auth0_org_id);
create index if not exists idx_safety_responses_site     on public.safety_checklist_responses (site_id, auth0_org_id);

create index if not exists idx_incidents_org_occurred    on public.incident_reports (auth0_org_id, occurred_at desc);
create index if not exists idx_incidents_org_status      on public.incident_reports (auth0_org_id, status);
create index if not exists idx_incidents_reporter        on public.incident_reports (auth0_org_id, reporter_id);
create index if not exists idx_incidents_manager         on public.incident_reports (manager_user_id, auth0_org_id);
create index if not exists idx_incidents_site            on public.incident_reports (site_id, auth0_org_id);
create index if not exists idx_incidents_department      on public.incident_reports (department_id, auth0_org_id);

-- jsonb containment lookups
create index if not exists idx_organizations_metadata    on public.organizations using gin (metadata);
create index if not exists idx_audit_diff                on public.audit_logs using gin (diff);
create index if not exists idx_safety_templates_items    on public.safety_checklist_templates using gin (items);
create index if not exists idx_incidents_photos          on public.incident_reports using gin (photos);
create index if not exists idx_forecasts_input           on public.labour_forecasts using gin (input_summary);


-- =====================================================================
-- 7. grants
--
-- supabase does not grant public-schema privileges by default: rls alone
-- is not enough, postgrest returns a permission error without these.
--
-- no `anon` grants anywhere — every policy is tenant-scoped and this
-- product has no public surface.
-- =====================================================================

do $grants$
declare
  v_table text;
begin
  foreach v_table in array array[
    'organizations', 'users', 'user_credentials', 'org_departments', 'org_sites',
    'org_roles', 'org_shifts', 'org_members', 'subscriptions', 'invitations',
    'audit_logs', 'org_attendance', 'org_leave_balances', 'labour_forecasts',
    'labour_alerts', 'payroll_export_runs', 'support_tickets', 'support_messages',
    'csm_assignments', 'safety_checklist_templates', 'safety_checklist_responses',
    'incident_reports'
  ] loop
    -- supabase installs default privileges that grant `anon` on every new
    -- table in public. this schema has no public surface, so strip them.
    execute format('revoke all on public.%I from anon', v_table);
    execute format('grant select, insert, update, delete on public.%I to authenticated', v_table);
    execute format('grant all on public.%I to service_role', v_table);
  end loop;
end
$grants$;

-- credential hashes are for the custom-db scripts (service_role / pooler)
-- only: never let the authenticated data api read them, even though the
-- rls select policy would otherwise permit an org admin to.
revoke select (password_hash) on public.user_credentials from authenticated;


-- =====================================================================
-- 8. row level security
--
-- baseline for every table: auth0_org_id = (select auth0.current_org_id())
-- write access is layered on top by role (member / manager / admin).
--
-- scalability note: every helper call is wrapped in a scalar subquery.
-- postgres then evaluates it once per statement as an initplan instead of
-- once per row — the single largest rls performance factor on supabase.
-- =====================================================================

do $rls$
declare
  v_table text;
begin
  foreach v_table in array array[
    'organizations', 'users', 'user_credentials', 'org_departments', 'org_sites',
    'org_roles', 'org_shifts', 'org_members', 'subscriptions', 'invitations',
    'audit_logs', 'org_attendance', 'org_leave_balances', 'labour_forecasts',
    'labour_alerts', 'payroll_export_runs', 'support_tickets', 'support_messages',
    'csm_assignments', 'safety_checklist_templates', 'safety_checklist_responses',
    'incident_reports'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
  end loop;
end
$rls$;

-- drop any previous version of the policies defined below. scoped to this
-- schema's own tables so hand-written policies elsewhere in public are
-- never silently removed.
do $droppolicies$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename = any (array[
         'organizations', 'users', 'user_credentials', 'org_departments', 'org_sites',
         'org_roles', 'org_shifts', 'org_members', 'subscriptions', 'invitations',
         'audit_logs', 'org_attendance', 'org_leave_balances', 'labour_forecasts',
         'labour_alerts', 'payroll_export_runs', 'support_tickets', 'support_messages',
         'csm_assignments', 'safety_checklist_templates', 'safety_checklist_responses',
         'incident_reports'
       ])
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end
$droppolicies$;

-- --- organizations ---------------------------------------------------
create policy "organizations_select"
  on public.organizations
  for select
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()));

create policy "organizations_update"
  on public.organizations
  for update
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()))
  with check (auth0_org_id = (select auth0.current_org_id()));

-- insert/delete of tenants is a provisioning concern: service_role only.

-- --- users -----------------------------------------------------------
create policy "users_select"
  on public.users
  for select
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()));

-- a member may edit their own profile; admins may edit anyone in the org
create policy "users_update"
  on public.users
  for update
  to authenticated
  using (
    auth0_org_id = (select auth0.current_org_id())
    and (auth0_user_id = (select auth0.current_user_id()) or (select auth0.is_org_admin()))
  )
  with check (auth0_org_id = (select auth0.current_org_id()));

create policy "users_insert"
  on public.users
  for insert
  to authenticated
  with check (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()));

create policy "users_delete"
  on public.users
  for delete
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()));

-- --- user_credentials -------------------------------------------------
-- auth0 account state: readable only by the owner and org admins, and
-- written exclusively by the auth0 sync job (service_role).
create policy "user_credentials_select"
  on public.user_credentials
  for select
  to authenticated
  using (
    auth0_org_id = (select auth0.current_org_id())
    and (auth0_user_id = (select auth0.current_user_id()) or (select auth0.is_org_admin()))
  );

-- --- org_departments --------------------------------------------------
create policy "departments_select"
  on public.org_departments
  for select
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()));

create policy "departments_write"
  on public.org_departments
  for all
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()))
  with check (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()));

-- --- org_sites --------------------------------------------------------
create policy "sites_select"
  on public.org_sites
  for select
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()));

create policy "sites_write"
  on public.org_sites
  for all
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()))
  with check (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()));

-- --- org_roles --------------------------------------------------------
create policy "roles_select"
  on public.org_roles
  for select
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()));

create policy "roles_write"
  on public.org_roles
  for all
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()))
  with check (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()));

-- --- org_shifts -------------------------------------------------------
create policy "shifts_select"
  on public.org_shifts
  for select
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()));

create policy "shifts_write"
  on public.org_shifts
  for all
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_manager()))
  with check (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_manager()));

-- --- org_members ------------------------------------------------------
-- everyone in the org can see the directory. hourly_rate and tax_number
-- are compensation data: expose them through a restricted view, or move
-- them to an admin-only table, if the directory must stay open.
create policy "members_select"
  on public.org_members
  for select
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()));

create policy "members_insert"
  on public.org_members
  for insert
  to authenticated
  with check (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()));

create policy "members_update"
  on public.org_members
  for update
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()))
  with check (auth0_org_id = (select auth0.current_org_id()));

-- only owners may remove a member, and never themselves
create policy "members_delete"
  on public.org_members
  for delete
  to authenticated
  using (
    auth0_org_id = (select auth0.current_org_id())
    and (select auth0.current_role()) = 'owner'
    and auth0_user_id <> (select auth0.current_user_id())
  );

-- --- subscriptions ----------------------------------------------------
create policy "subscriptions_select"
  on public.subscriptions
  for select
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()));

-- billing writes arrive from the payment webhook: service_role only.

-- --- invitations ------------------------------------------------------
create policy "invitations_select"
  on public.invitations
  for select
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()));

create policy "invitations_write"
  on public.invitations
  for all
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()))
  with check (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()));

-- token redemption is anonymous by nature and must not be a client read.
-- redeem through a service_role server function that looks the token up.

-- --- audit_logs (append-only) ----------------------------------------
create policy "audit_select"
  on public.audit_logs
  for select
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()));

create policy "audit_insert"
  on public.audit_logs
  for insert
  to authenticated
  with check (
    auth0_org_id  = (select auth0.current_org_id())
    and auth0_user_id = (select auth0.current_user_id())
  );

-- no update or delete policy: audit rows are immutable to app users.

-- --- org_attendance ---------------------------------------------------
create policy "attendance_select"
  on public.org_attendance
  for select
  to authenticated
  using (
    auth0_org_id = (select auth0.current_org_id())
    and (auth0_user_id = (select auth0.current_user_id()) or (select auth0.is_org_manager()))
  );

-- a worker may clock their own attendance
create policy "attendance_insert"
  on public.org_attendance
  for insert
  to authenticated
  with check (
    auth0_org_id = (select auth0.current_org_id())
    and (auth0_user_id = (select auth0.current_user_id()) or (select auth0.is_org_manager()))
  );

-- corrections are a manager action
create policy "attendance_update"
  on public.org_attendance
  for update
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_manager()))
  with check (auth0_org_id = (select auth0.current_org_id()));

create policy "attendance_delete"
  on public.org_attendance
  for delete
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()));

-- --- org_leave_balances ----------------------------------------------
create policy "leave_select"
  on public.org_leave_balances
  for select
  to authenticated
  using (
    auth0_org_id = (select auth0.current_org_id())
    and (auth0_user_id = (select auth0.current_user_id()) or (select auth0.is_org_manager()))
  );

create policy "leave_write"
  on public.org_leave_balances
  for all
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_manager()))
  with check (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_manager()));

-- --- labour_forecasts -------------------------------------------------
create policy "forecasts_select"
  on public.labour_forecasts
  for select
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_manager()));

create policy "forecasts_write"
  on public.labour_forecasts
  for all
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()))
  with check (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()));

-- --- labour_alerts ----------------------------------------------------
create policy "alerts_select"
  on public.labour_alerts
  for select
  to authenticated
  using (
    auth0_org_id = (select auth0.current_org_id())
    and (auth0_user_id = (select auth0.current_user_id()) or (select auth0.is_org_manager()))
  );

create policy "alerts_insert"
  on public.labour_alerts
  for insert
  to authenticated
  with check (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_manager()));

create policy "alerts_update"
  on public.labour_alerts
  for update
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_manager()))
  with check (auth0_org_id = (select auth0.current_org_id()));

create policy "alerts_delete"
  on public.labour_alerts
  for delete
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()));

-- --- payroll_export_runs ---------------------------------------------
create policy "payroll_select"
  on public.payroll_export_runs
  for select
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()));

create policy "payroll_insert"
  on public.payroll_export_runs
  for insert
  to authenticated
  with check (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()));

-- --- support_tickets --------------------------------------------------
create policy "tickets_select"
  on public.support_tickets
  for select
  to authenticated
  using (
    auth0_org_id = (select auth0.current_org_id())
    and (created_by = (select auth0.current_user_id()) or (select auth0.is_org_admin()))
  );

create policy "tickets_insert"
  on public.support_tickets
  for insert
  to authenticated
  with check (
    auth0_org_id = (select auth0.current_org_id())
    and created_by = (select auth0.current_user_id())
  );

create policy "tickets_update"
  on public.support_tickets
  for update
  to authenticated
  using (
    auth0_org_id = (select auth0.current_org_id())
    and (created_by = (select auth0.current_user_id()) or (select auth0.is_org_admin()))
  )
  with check (auth0_org_id = (select auth0.current_org_id()));

-- --- support_messages -------------------------------------------------
-- is_internal messages are agent-only notes and must never reach the customer.
create policy "messages_select"
  on public.support_messages
  for select
  to authenticated
  using (
    auth0_org_id = (select auth0.current_org_id())
    and is_internal = false
    and exists (
      select 1
        from public.support_tickets t
       where t.id = support_messages.ticket_id
         and t.auth0_org_id = (select auth0.current_org_id())
         and (t.created_by = (select auth0.current_user_id()) or (select auth0.is_org_admin()))
    )
  );

create policy "messages_insert"
  on public.support_messages
  for insert
  to authenticated
  with check (
    auth0_org_id = (select auth0.current_org_id())
    and is_internal = false
    and author_role = 'customer'
    and author_id = (select auth0.current_user_id())
    and exists (
      select 1
        from public.support_tickets t
       where t.id = support_messages.ticket_id
         and t.auth0_org_id = (select auth0.current_org_id())
         and t.status <> 'closed'
    )
  );

-- --- csm_assignments (read-only to the tenant) ------------------------
create policy "csm_select"
  on public.csm_assignments
  for select
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_admin()));

-- --- safety_checklist_templates ---------------------------------------
create policy "safety_templates_select"
  on public.safety_checklist_templates
  for select
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()));

create policy "safety_templates_write"
  on public.safety_checklist_templates
  for all
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_manager()))
  with check (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_manager()));

-- --- safety_checklist_responses (signed record: insert-only for workers)
create policy "safety_responses_select"
  on public.safety_checklist_responses
  for select
  to authenticated
  using (
    auth0_org_id = (select auth0.current_org_id())
    and (auth0_user_id = (select auth0.current_user_id()) or (select auth0.is_org_manager()))
  );

create policy "safety_responses_insert"
  on public.safety_checklist_responses
  for insert
  to authenticated
  with check (
    auth0_org_id = (select auth0.current_org_id())
    and auth0_user_id = (select auth0.current_user_id())
  );

-- no update/delete: a signed safety record is immutable evidence.

-- --- incident_reports -------------------------------------------------
create policy "incidents_select"
  on public.incident_reports
  for select
  to authenticated
  using (
    auth0_org_id = (select auth0.current_org_id())
    and (reporter_id = (select auth0.current_user_id()) or (select auth0.is_org_manager()))
  );

create policy "incidents_insert"
  on public.incident_reports
  for insert
  to authenticated
  with check (
    auth0_org_id = (select auth0.current_org_id())
    and reporter_id = (select auth0.current_user_id())
  );

-- only managers may counter-sign or close; the reporter is fixed
create policy "incidents_update"
  on public.incident_reports
  for update
  to authenticated
  using (auth0_org_id = (select auth0.current_org_id()) and (select auth0.is_org_manager()))
  with check (auth0_org_id = (select auth0.current_org_id()));


-- =====================================================================
-- 9. triggers
-- =====================================================================

-- 9a. updated_at maintenance
do $updatedat$
declare
  v_table text;
begin
  foreach v_table in array array[
    'organizations', 'users', 'user_credentials', 'org_departments', 'org_sites',
    'org_roles', 'org_shifts', 'org_members', 'subscriptions', 'org_attendance',
    'org_leave_balances', 'labour_alerts', 'support_tickets', 'csm_assignments',
    'safety_checklist_templates', 'incident_reports'
  ] loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%I', v_table, v_table);
    execute format(
      'create trigger trg_%s_updated_at
         before update on public.%I
         for each row
         execute function public.set_updated_at()',
      v_table, v_table
    );
  end loop;
end
$updatedat$;

-- 9b. tenant-safe "set null" on parent delete (see tenant_null_child_ref)
do $nullrefs$
declare
  r record;
  v_trigger text;
begin
  for r in
    select *
      from (values
        ('org_departments', 'id',            'org_members',                'department_id'),
        ('org_departments', 'id',            'org_attendance',             'department_id'),
        ('org_departments', 'id',            'incident_reports',           'department_id'),
        ('org_sites',       'id',            'org_members',                'site_id'),
        ('org_sites',       'id',            'org_attendance',             'site_id'),
        ('org_sites',       'id',            'safety_checklist_responses', 'site_id'),
        ('org_sites',       'id',            'incident_reports',           'site_id'),
        ('org_roles',       'id',            'org_members',                'job_role_id'),
        ('org_shifts',      'id',            'org_members',                'shift_id'),
        ('org_shifts',      'id',            'safety_checklist_responses', 'shift_id'),
        ('org_members',     'id',            'org_members',                'manager_id'),
        ('org_members',     'id',            'invitations',                'accepted_member_id'),
        ('org_members',     'auth0_user_id', 'invitations',                'invited_by'),
        ('org_members',     'auth0_user_id', 'labour_forecasts',           'generated_by'),
        ('org_members',     'auth0_user_id', 'labour_alerts',              'acknowledged_by'),
        ('org_members',     'auth0_user_id', 'payroll_export_runs',        'generated_by'),
        ('org_members',     'auth0_user_id', 'support_tickets',            'created_by'),
        ('org_members',     'auth0_user_id', 'safety_checklist_templates', 'created_by'),
        ('org_members',     'auth0_user_id', 'incident_reports',           'manager_user_id')
      ) as v(parent_table, parent_key, child_table, child_col)
  loop
    v_trigger := format('trg_%s_null_%s_%s', r.parent_table, r.child_table, r.child_col);

    execute format('drop trigger if exists %I on public.%I', v_trigger, r.parent_table);
    execute format(
      'create trigger %I
         before delete on public.%I
         for each row
         execute function public.tenant_null_child_ref(%L, %L, %L)',
      v_trigger, r.parent_table, r.child_table, r.child_col, r.parent_key
    );
  end loop;
end
$nullrefs$;

-- 9c. keep users.auth0_org_id aligned with the membership record
drop trigger if exists trg_members_sync_org on public.org_members;
create trigger trg_members_sync_org
  after insert or update of auth0_org_id on public.org_members
  for each row
  execute function public.sync_member_org();

-- 9d. stamp audit rows with the caller's real identity
drop trigger if exists trg_audit_guard on public.audit_logs;
create trigger trg_audit_guard
  before insert on public.audit_logs
  for each row
  execute function public.guard_audit_log();

-- 9e. derive sla deadlines from ticket priority
drop trigger if exists trg_tickets_sla on public.support_tickets;
create trigger trg_tickets_sla
  before insert on public.support_tickets
  for each row
  execute function public.set_ticket_sla();


-- =====================================================================
-- 10. storage / scalability tuning
--
-- these are the settings that matter once a tenant table passes a few
-- million rows. they are cheap to set now and painful to retrofit under
-- load, because altering a hot table takes an access exclusive lock.
-- =====================================================================

-- attendance and alerts are update-heavy: leave room on each page so
-- updates stay HOT (no index rewrite) instead of migrating tuples.
alter table public.org_attendance set (fillfactor = 85);
alter table public.labour_alerts  set (fillfactor = 85);
alter table public.org_members    set (fillfactor = 90);
alter table public.support_tickets set (fillfactor = 90);

-- append-only, fastest-growing tables: vacuum/analyze them far more
-- eagerly than the 20% default so the planner keeps accurate statistics
-- and the visibility map stays warm for index-only scans.
alter table public.audit_logs set (
  autovacuum_vacuum_scale_factor  = 0.02,
  autovacuum_analyze_scale_factor = 0.01
);

alter table public.org_attendance set (
  autovacuum_vacuum_scale_factor  = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

alter table public.safety_checklist_responses set (
  autovacuum_vacuum_scale_factor  = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

-- the tenant key drives every plan in the system: raise its statistics
-- target so the planner estimates per-tenant selectivity correctly once
-- tenant sizes become badly skewed (a handful of huge orgs, a long tail
-- of small ones — the normal b2b saas distribution).
alter table public.org_attendance alter column auth0_org_id set statistics 1000;
alter table public.audit_logs     alter column auth0_org_id set statistics 1000;
alter table public.org_members    alter column auth0_org_id set statistics 1000;
alter table public.labour_alerts  alter column auth0_org_id set statistics 1000;

-- scaling further:
--   * org_attendance and audit_logs are the first partitioning
--     candidates — declarative range partitioning on (created_at) by
--     month, or hash partitioning on auth0_org_id for very wide tenant
--     counts. do it before ~50m rows; the migration needs a rewrite.
--   * a retention job on audit_logs (delete older than N months) keeps
--     the brin index and autovacuum cost bounded.
--   * every list endpoint should paginate with keyset pagination on the
--     (auth0_org_id, created_at desc) indexes above, never offset.


-- =====================================================================
-- 11. postflight verification
--
-- fails the transaction if the security posture is not what this file
-- claims. this is the check that catches a partially-edited schema.
-- =====================================================================

do $postflight$
declare
  v_tables text[] := array[
    'organizations', 'users', 'user_credentials', 'org_departments', 'org_sites',
    'org_roles', 'org_shifts', 'org_members', 'subscriptions', 'invitations',
    'audit_logs', 'org_attendance', 'org_leave_balances', 'labour_forecasts',
    'labour_alerts', 'payroll_export_runs', 'support_tickets', 'support_messages',
    'csm_assignments', 'safety_checklist_templates', 'safety_checklist_responses',
    'incident_reports'
  ];
  v_table   text;
  v_bad     text[] := '{}';
  v_count   bigint;
begin
  foreach v_table in array v_tables loop
    -- every table exists
    if to_regclass('public.' || quote_ident(v_table)) is null then
      raise exception 'postflight: table public.% is missing', v_table;
    end if;

    -- rls is enabled
    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = v_table and c.relrowsecurity
    ) then
      raise exception 'postflight: rls is not enabled on public.%', v_table;
    end if;

    -- at least one policy exists (rls without policies denies everything)
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = v_table
    ) then
      raise exception 'postflight: public.% has rls enabled but no policies', v_table;
    end if;

    -- the tenant key is indexed
    if not exists (
      select 1
        from pg_index i
        join pg_class c on c.oid = i.indrelid
        join pg_namespace n on n.oid = c.relnamespace
        join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
       where n.nspname = 'public'
         and c.relname = v_table
         and a.attname = 'auth0_org_id'
    ) then
      v_bad := v_bad || v_table;
    end if;
  end loop;

  if array_length(v_bad, 1) is not null then
    raise exception 'postflight: no leading index on auth0_org_id for: %', array_to_string(v_bad, ', ');
  end if;

  -- no table may be readable by anon
  select count(*)
    into v_count
    from information_schema.role_table_grants
   where table_schema = 'public'
     and grantee = 'anon'
     and table_name = any (v_tables);

  if v_count > 0 then
    raise exception 'postflight: % anon grants found on tenant tables. this schema has no public surface.', v_count;
  end if;

  -- credential hashes live in user_credentials.password_hash for the auth0
  -- custom-database scripts (auth0/database-scripts/*.js). the column is
  -- retained by design; section 7 revokes column-level select from the
  -- authenticated role so it is never exposed through postgrest.

  raise notice 'postflight passed: % tables, rls enforced, tenant keys indexed', array_length(v_tables, 1);
end
$postflight$;

commit;

-- statistics targets above only take effect for the planner after an
-- analyze; run it outside the transaction so it does not hold locks.
analyze public.org_members;
analyze public.org_attendance;
analyze public.audit_logs;


-- =====================================================================
-- 12. legacy migration helpers (destructive — run manually, one at a time)
--
-- the file above assumes it is applied to a fresh project, or to a
-- database that already satisfies the section 0 preflight. against the
-- original dump the steps below must be run FIRST, in this order, each
-- inside its own transaction, with the counts checked in between.
-- they are left commented on purpose.
-- =====================================================================

-- -- 12.1 find rows stranded in the "empty tenant" (the ''::text default).
-- --      these rows belong to no organization and must be re-homed or deleted.
-- select 'users' as table_name, count(*) from public.users where auth0_org_id = ''
-- union all select 'org_members',   count(*) from public.org_members   where auth0_org_id = ''
-- union all select 'org_attendance', count(*) from public.org_attendance where auth0_org_id = '';

-- -- 12.2 drop the dangerous tenant-key defaults (repeat per table).
-- alter table public.users          alter column auth0_org_id  drop default;
-- alter table public.users          alter column auth0_user_id drop default;
-- alter table public.org_members    alter column auth0_org_id  drop default;
-- alter table public.org_members    alter column auth0_user_id drop default;
-- alter table public.org_attendance alter column auth0_org_id  drop default;
-- alter table public.org_attendance alter column auth0_user_id drop default;

-- -- 12.3 remove the credential hash. auth0 owns credentials and this
-- --      column is reachable through postgrest.
-- alter table public.user_credentials drop column if exists password_hash;

-- -- 12.4 break the users <-> user_credentials cycle.
-- alter table public.org_members drop constraint if exists org_members_auth0_user_id_fkey;
-- alter table public.org_members
--   add constraint org_members_user_fkey foreign key (auth0_user_id, auth0_org_id)
--   references public.users (auth0_user_id, auth0_org_id) on delete cascade not valid;
-- -- validate separately: this takes only a share update exclusive lock.
-- alter table public.org_members validate constraint org_members_user_fkey;

-- -- 12.5 drop the invalid duplicate-named member fks before the
-- --      composite replacements are added.
-- alter table public.org_attendance     drop constraint if exists org_attendance_member_fkey;
-- alter table public.org_leave_balances drop constraint if exists org_leave_balances_member_fkey;

-- -- 12.6 de-duplicate before the new unique constraints can be created.
-- select auth0_org_id, auth0_user_id, date, count(*)
--   from public.org_attendance group by 1, 2, 3 having count(*) > 1;
-- select auth0_org_id, auth0_user_id, leave_type, count(*)
--   from public.org_leave_balances group by 1, 2, 3 having count(*) > 1;
-- select slug, count(*) from public.organizations group by 1 having count(*) > 1;

-- -- 12.7 detect cross-tenant references that the composite fks reject.
-- select m.id from public.org_members m
--   join public.org_departments d on d.id = m.department_id
--  where d.auth0_org_id <> m.auth0_org_id;
-- select m.id from public.org_members m
--   join public.org_sites s on s.id = m.site_id
--  where s.auth0_org_id <> m.auth0_org_id;

-- -- 12.8 column renames and type changes applied by this schema.
-- alter table public.org_sites rename column geo_radius to geo_radius_m;
-- alter table public.safety_checklist_responses rename column user_id to auth0_user_id;
-- alter table public.incident_reports rename column manager_id to manager_user_id;
-- alter table public.org_attendance
--   alter column created_at type timestamptz using created_at at time zone 'UTC';

-- -- 12.9 on a live database, build indexes without blocking writes:
-- --      run each "create index" from section 6 as
-- --      "create index concurrently ..." OUTSIDE any transaction.
-- --      concurrently cannot run inside the begin/commit block above.

-- =====================================================================
-- end
-- =====================================================================
