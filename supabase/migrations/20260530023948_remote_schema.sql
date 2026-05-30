create type "public"."access_request_status" as enum ('pending', 'approved', 'rejected', 'expired');

create type "public"."attendance_status" as enum ('present', 'late', 'absent', 'leave', 'holiday');

create type "public"."billing_plan" as enum ('starter', 'growth', 'pro', 'enterprise');

create type "public"."billing_status" as enum ('trialing', 'active', 'past_due', 'canceled');

create type "public"."check_in_method" as enum ('qr', 'biometric', 'whatsapp', 'manual', 'geofence');

create type "public"."membership_status" as enum ('invited', 'active', 'suspended', 'offboarded');

create type "public"."tenant_role" as enum ('admin', 'manager', 'supervisor', 'employee');

create type "public"."tenant_status" as enum ('provisioning', 'active', 'suspended', 'offboarding', 'archived');

create type "public"."user_status" as enum ('active', 'suspended', 'deleted');


  create table "public"."access_requests" (
    "id" uuid not null default gen_random_uuid(),
    "requester_email" text not null,
    "requester_name" text,
    "target_tenant_id" uuid,
    "email_domain" text not null,
    "message" text,
    "status" public.access_request_status not null default 'pending'::public.access_request_status,
    "decided_by" text,
    "decided_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."access_requests" enable row level security;


  create table "public"."attendance_records" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "employee_id" text not null,
    "site_id" uuid,
    "date" date not null default CURRENT_DATE,
    "clock_in" timestamp with time zone,
    "clock_out" timestamp with time zone,
    "method" public.check_in_method not null default 'manual'::public.check_in_method,
    "status" public.attendance_status not null default 'present'::public.attendance_status,
    "latitude" double precision,
    "longitude" double precision,
    "verified" boolean not null default false,
    "verified_by" text,
    "hours_worked" numeric(6,2),
    "overtime" numeric(6,2),
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."attendance_records" enable row level security;


  create table "public"."audit_log" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "user_id" text,
    "action" text not null,
    "target_table" text,
    "target_id" uuid,
    "details" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."audit_log" enable row level security;


  create table "public"."departments" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "name" text not null default ''::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "site_id" uuid
      );


alter table "public"."departments" enable row level security;


  create table "public"."employee_profiles" (
    "membership_id" uuid not null,
    "tenant_id" uuid not null,
    "site_id" uuid,
    "department_id" uuid,
    "job_title" text,
    "id_number" text,
    "date_of_birth" date,
    "start_date" date,
    "phone" text,
    "address" text,
    "emergency_contact_name" text,
    "emergency_contact_phone" text,
    "bio" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."employee_profiles" enable row level security;


  create table "public"."memberships" (
    "created_at" timestamp with time zone not null default now(),
    "tenant_id" uuid not null,
    "user_id" text not null default gen_random_uuid(),
    "role" public.tenant_role not null default 'employee'::public.tenant_role,
    "status" public.membership_status not null default 'invited'::public.membership_status,
    "invited_by" text not null,
    "updated_at" timestamp with time zone not null default now(),
    "joined_at" timestamp with time zone not null,
    "id" uuid not null default gen_random_uuid()
      );


alter table "public"."memberships" enable row level security;


  create table "public"."organisation_roles" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null default gen_random_uuid(),
    "name" text not null default ''::text,
    "base_role" public.tenant_role not null,
    "created_at" timestamp with time zone
      );


alter table "public"."organisation_roles" enable row level security;


  create table "public"."sales_leads" (
    "id" uuid not null default gen_random_uuid(),
    "full_name" text not null,
    "work_email" text not null,
    "phone" text,
    "company_name" text not null,
    "employee_count" text,
    "selected_plan" text,
    "country" text,
    "message" text,
    "status" text not null default 'new'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."sales_leads" enable row level security;


  create table "public"."shifts" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null default gen_random_uuid(),
    "site_id" uuid not null,
    "name" text not null default ''::text,
    "start_time" time without time zone not null,
    "end_time" time without time zone not null,
    "grace_period_minutes" bigint not null default '15'::bigint,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."shifts" enable row level security;


  create table "public"."sites" (
    "created_at" timestamp with time zone not null default now(),
    "name" text not null default ''::text,
    "address" text not null default ''::text,
    "latitude" double precision,
    "longitude" double precision,
    "geofence_radius_m" bigint not null default '200'::bigint,
    "updated_at" timestamp with time zone not null default now(),
    "tenant_id" uuid not null,
    "id" uuid not null default gen_random_uuid()
      );


alter table "public"."sites" enable row level security;


  create table "public"."subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "plan" public.billing_plan not null default 'starter'::public.billing_plan,
    "status" public.billing_status not null default 'trialing'::public.billing_status,
    "seat_cap" integer not null default 25,
    "stripe_customer_id" text,
    "stripe_subscription_id" text,
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."subscriptions" enable row level security;


  create table "public"."tenants" (
    "id" uuid not null default gen_random_uuid(),
    "auth0_org_id" text not null,
    "slug" text not null,
    "name" text not null,
    "status" public.tenant_status not null default 'provisioning'::public.tenant_status,
    "industry" text,
    "country" text not null default 'South Africa'::text,
    "logo_url" text,
    "settings" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "plan" text
      );


alter table "public"."tenants" enable row level security;


  create table "public"."users" (
    "id" text not null,
    "email" text not null,
    "full_name" text not null default ''::text,
    "avatar_url" text,
    "status" public.user_status not null default 'active'::public.user_status,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "password_hash" text,
    "auth0_user_id" text not null default ''::text
      );


alter table "public"."users" enable row level security;

CREATE INDEX access_req_domain_idx ON public.access_requests USING btree (email_domain, status);

CREATE UNIQUE INDEX access_requests_pkey ON public.access_requests USING btree (id);

CREATE INDEX att_tenant_emp_date_idx ON public.attendance_records USING btree (tenant_id, employee_id, date);

CREATE INDEX att_tenant_site_date_idx ON public.attendance_records USING btree (tenant_id, site_id, date);

CREATE UNIQUE INDEX attendance_records_pkey ON public.attendance_records USING btree (id);

CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id);

CREATE INDEX audit_tenant_time_idx ON public.audit_log USING btree (tenant_id, created_at DESC);

CREATE UNIQUE INDEX departments_pkey ON public.departments USING btree (id);

CREATE INDEX departments_tenant_idx ON public.departments USING btree (tenant_id, site_id);

CREATE INDEX emp_profiles_tenant_idx ON public.employee_profiles USING btree (tenant_id, site_id);

CREATE UNIQUE INDEX employee_profiles_pkey ON public.employee_profiles USING btree (membership_id);

CREATE UNIQUE INDEX memberships_pkey ON public.memberships USING btree (id);

CREATE INDEX memberships_tenant_idx ON public.memberships USING btree (tenant_id, status);

CREATE UNIQUE INDEX memberships_tenant_user_unique ON public.memberships USING btree (tenant_id, user_id);

CREATE UNIQUE INDEX organisation_roles_name_key ON public.organisation_roles USING btree (name);

CREATE UNIQUE INDEX organisation_roles_pkey ON public.organisation_roles USING btree (id);

CREATE UNIQUE INDEX organisation_roles_tenant_id_key ON public.organisation_roles USING btree (tenant_id);

CREATE UNIQUE INDEX sales_leads_pkey ON public.sales_leads USING btree (id);

CREATE UNIQUE INDEX shifts_pkey ON public.shifts USING btree (id);

CREATE INDEX shifts_tenant_idx ON public.shifts USING btree (tenant_id, site_id);

CREATE UNIQUE INDEX sites_pkey ON public.sites USING btree (id);

CREATE INDEX sites_tenant_idx ON public.sites USING btree (tenant_id);

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id);

CREATE UNIQUE INDEX subscriptions_tenant_id_key ON public.subscriptions USING btree (tenant_id);

CREATE UNIQUE INDEX tenants_pkey ON public.tenants USING btree (id);

CREATE UNIQUE INDEX users_auth0_user_id_key ON public.users USING btree (auth0_user_id);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."access_requests" add constraint "access_requests_pkey" PRIMARY KEY using index "access_requests_pkey";

alter table "public"."attendance_records" add constraint "attendance_records_pkey" PRIMARY KEY using index "attendance_records_pkey";

alter table "public"."audit_log" add constraint "audit_log_pkey" PRIMARY KEY using index "audit_log_pkey";

alter table "public"."departments" add constraint "departments_pkey" PRIMARY KEY using index "departments_pkey";

alter table "public"."employee_profiles" add constraint "employee_profiles_pkey" PRIMARY KEY using index "employee_profiles_pkey";

alter table "public"."memberships" add constraint "memberships_pkey" PRIMARY KEY using index "memberships_pkey";

alter table "public"."organisation_roles" add constraint "organisation_roles_pkey" PRIMARY KEY using index "organisation_roles_pkey";

alter table "public"."sales_leads" add constraint "sales_leads_pkey" PRIMARY KEY using index "sales_leads_pkey";

alter table "public"."shifts" add constraint "shifts_pkey" PRIMARY KEY using index "shifts_pkey";

alter table "public"."sites" add constraint "sites_pkey" PRIMARY KEY using index "sites_pkey";

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."tenants" add constraint "tenants_pkey" PRIMARY KEY using index "tenants_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."access_requests" add constraint "access_requests_decided_by_fkey" FOREIGN KEY (decided_by) REFERENCES public.users(id) not valid;

alter table "public"."access_requests" validate constraint "access_requests_decided_by_fkey";

alter table "public"."access_requests" add constraint "access_requests_target_tenant_id_fkey" FOREIGN KEY (target_tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."access_requests" validate constraint "access_requests_target_tenant_id_fkey";

alter table "public"."attendance_records" add constraint "attendance_records_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.users(id) not valid;

alter table "public"."attendance_records" validate constraint "attendance_records_employee_id_fkey";

alter table "public"."attendance_records" add constraint "attendance_records_site_id_fkey" FOREIGN KEY (site_id) REFERENCES public.sites(id) not valid;

alter table "public"."attendance_records" validate constraint "attendance_records_site_id_fkey";

alter table "public"."attendance_records" add constraint "attendance_records_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."attendance_records" validate constraint "attendance_records_tenant_id_fkey";

alter table "public"."attendance_records" add constraint "attendance_records_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES public.users(id) not valid;

alter table "public"."attendance_records" validate constraint "attendance_records_verified_by_fkey";

alter table "public"."audit_log" add constraint "audit_log_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL not valid;

alter table "public"."audit_log" validate constraint "audit_log_tenant_id_fkey";

alter table "public"."audit_log" add constraint "audit_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."audit_log" validate constraint "audit_log_user_id_fkey";

alter table "public"."departments" add constraint "departments_site_id_fkey" FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE not valid;

alter table "public"."departments" validate constraint "departments_site_id_fkey";

alter table "public"."departments" add constraint "departments_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."departments" validate constraint "departments_tenant_id_fkey";

alter table "public"."employee_profiles" add constraint "employee_profiles_department_id_fkey" FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL not valid;

alter table "public"."employee_profiles" validate constraint "employee_profiles_department_id_fkey";

alter table "public"."employee_profiles" add constraint "employee_profiles_membership_id_fkey" FOREIGN KEY (membership_id) REFERENCES public.memberships(id) ON DELETE CASCADE not valid;

alter table "public"."employee_profiles" validate constraint "employee_profiles_membership_id_fkey";

alter table "public"."employee_profiles" add constraint "employee_profiles_site_id_fkey" FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE SET NULL not valid;

alter table "public"."employee_profiles" validate constraint "employee_profiles_site_id_fkey";

alter table "public"."employee_profiles" add constraint "employee_profiles_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."employee_profiles" validate constraint "employee_profiles_tenant_id_fkey";

alter table "public"."memberships" add constraint "memberships_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."memberships" validate constraint "memberships_tenant_id_fkey";

alter table "public"."memberships" add constraint "memberships_tenant_user_unique" UNIQUE using index "memberships_tenant_user_unique";

alter table "public"."memberships" add constraint "memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."memberships" validate constraint "memberships_user_id_fkey";

alter table "public"."organisation_roles" add constraint "organisation_roles_name_key" UNIQUE using index "organisation_roles_name_key";

alter table "public"."organisation_roles" add constraint "organisation_roles_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."organisation_roles" validate constraint "organisation_roles_tenant_id_fkey";

alter table "public"."organisation_roles" add constraint "organisation_roles_tenant_id_key" UNIQUE using index "organisation_roles_tenant_id_key";

alter table "public"."shifts" add constraint "shifts_site_id_fkey" FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE SET NULL not valid;

alter table "public"."shifts" validate constraint "shifts_site_id_fkey";

alter table "public"."shifts" add constraint "shifts_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."shifts" validate constraint "shifts_tenant_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_tenant_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_tenant_id_key" UNIQUE using index "subscriptions_tenant_id_key";

alter table "public"."users" add constraint "users_auth0_user_id_key" UNIQUE using index "users_auth0_user_id_key";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.approve_access_request_and_invite(p_request_id uuid, p_default_role public.tenant_role DEFAULT 'employee'::public.tenant_role)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_tenant_slug text;
  v_tenant_id uuid;
  v_decider_user_id text;
  v_requester_user_id text;
begin
  -- Current tenant from header injected by useTenantApi()
  v_tenant_slug := (current_setting('request.headers', true)::jsonb ->> 'x-tenant-slug');

  if v_tenant_slug is null or v_tenant_slug = '' then
    raise exception 'Missing x-tenant-slug header';
  end if;

  select t.id
    into v_tenant_id
    from public.tenants t
   where t.slug = v_tenant_slug
   limit 1;

  if v_tenant_id is null then
    raise exception 'Tenant not found for slug: %', v_tenant_slug;
  end if;

-- Current signed-in user (Fixed for Auth0)
  v_decider_user_id := public.current_user_id();
  if v_decider_user_id is null or v_decider_user_id = '' then
    raise exception 'Not authenticated';
  end if;

  -- Requester user id in your app user table
  select u.id
    into v_requester_user_id
    from public.users u
   where lower(u.email) = (
     select lower(ar.requester_email)
     from public.access_requests ar
     where ar.id = p_request_id
   )
   limit 1;

  if v_requester_user_id is null then
    raise exception 'Requester user not found for request_id=%', p_request_id;
  end if;

  -- Ensure update happens only for pending request (+ optional tenant match)
  update public.access_requests
     set target_tenant_id = v_tenant_id,
         status = 'approved'::access_request_status,
         decided_by = v_decider_user_id,
         decided_at = now()
   where id = p_request_id
     and status = 'pending'
     and (target_tenant_id is null or target_tenant_id = v_tenant_id);

  if not found then
    raise exception 'Access request not found or not pending: %', p_request_id;
  end if;

  -- Insert membership only if one doesn't already exist for that tenant+user
  if not exists (
    select 1
      from public.memberships m
     where m.tenant_id = v_tenant_id
       and m.user_id = v_requester_user_id
  ) then
    insert into public.memberships (tenant_id, user_id, role, status, invited_by, joined_at)
    values (
      v_tenant_id,
      v_requester_user_id,
      p_default_role,
      default,
      v_decider_user_id,
      now()
    );
  end if;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.assert_tenant_match()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  ELSIF NEW.tenant_id <> public.current_tenant_id() THEN
    RAISE EXCEPTION 'tenant_id mismatch with JWT org_id' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.audit_log_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.audit_log (tenant_id, user_id, action, target_table, target_id, details)
  VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    (auth.jwt() ->> 'sub')::text,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id, NULL),
    to_jsonb(NEW)
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_user_password(p_email text, p_password text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_ok boolean;
BEGIN
  SELECT crypt(p_password, u.password_hash) = u.password_hash
  INTO v_ok
  FROM public.users u
  WHERE u.email = p_email;

  RETURN COALESCE(v_ok, false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Takes the native Auth0 'org_id' string and finds your internal UUID
  SELECT t.id
  FROM public.tenants t
  WHERE t.auth0_org_id = (auth.jwt() ->> 'org_id')
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.current_user_id()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.jwt() ->> 'sub'
$function$
;

-- 2. Update the defensive trigger to use the fixed function
CREATE OR REPLACE FUNCTION public.defensive_set_tenant_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Get the UUID using our unified function above
  v_tenant_id := public.current_tenant_id();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Missing or invalid Auth0 org_id claim in JWT';
  END IF;

  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := v_tenant_id;
  ELSIF NEW.tenant_id <> v_tenant_id THEN
    RAISE EXCEPTION 'tenant_id mismatch: Cannot insert data for a different tenant';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_seat_cap()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _cap int;
  _used int;
BEGIN
  -- Seat cap enforced only for active memberships
  IF NEW.status <> 'active'::membership_status THEN
    RETURN NEW;
  END IF;

  SELECT s.seat_cap
    INTO _cap
  FROM public.subscriptions s
  WHERE s.tenant_id = NEW.tenant_id
    AND s.status = 'active'::billing_status
  ORDER BY s.current_period_end DESC NULLS LAST
  LIMIT 1;

  -- If there is no active subscription, do not block writes.
  -- (Change to RAISE EXCEPTION if you prefer strict behavior.)
  IF _cap IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
    INTO _used
  FROM public.memberships m
  WHERE m.tenant_id = NEW.tenant_id
    AND m.status = 'active'::membership_status;

  IF _used >= _cap THEN
    RAISE EXCEPTION 'Seat cap reached for tenant % (cap=%, used=%)', NEW.tenant_id, _cap, _used
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_tenant_role(_role public.tenant_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.tenant_id = public.current_tenant_id()
      AND m.user_id   = public.current_user_id()
      AND m.role      = _role
      AND m.status    = 'active'
  )
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END $function$
;

grant delete on table "public"."access_requests" to "anon";

grant insert on table "public"."access_requests" to "anon";

grant references on table "public"."access_requests" to "anon";

grant select on table "public"."access_requests" to "anon";

grant trigger on table "public"."access_requests" to "anon";

grant truncate on table "public"."access_requests" to "anon";

grant update on table "public"."access_requests" to "anon";

grant delete on table "public"."access_requests" to "authenticated";

grant insert on table "public"."access_requests" to "authenticated";

grant references on table "public"."access_requests" to "authenticated";

grant select on table "public"."access_requests" to "authenticated";

grant trigger on table "public"."access_requests" to "authenticated";

grant truncate on table "public"."access_requests" to "authenticated";

grant update on table "public"."access_requests" to "authenticated";

grant delete on table "public"."access_requests" to "service_role";

grant insert on table "public"."access_requests" to "service_role";

grant references on table "public"."access_requests" to "service_role";

grant select on table "public"."access_requests" to "service_role";

grant trigger on table "public"."access_requests" to "service_role";

grant truncate on table "public"."access_requests" to "service_role";

grant update on table "public"."access_requests" to "service_role";

grant delete on table "public"."attendance_records" to "anon";

grant insert on table "public"."attendance_records" to "anon";

grant references on table "public"."attendance_records" to "anon";

grant select on table "public"."attendance_records" to "anon";

grant trigger on table "public"."attendance_records" to "anon";

grant truncate on table "public"."attendance_records" to "anon";

grant update on table "public"."attendance_records" to "anon";

grant delete on table "public"."attendance_records" to "authenticated";

grant insert on table "public"."attendance_records" to "authenticated";

grant references on table "public"."attendance_records" to "authenticated";

grant select on table "public"."attendance_records" to "authenticated";

grant trigger on table "public"."attendance_records" to "authenticated";

grant truncate on table "public"."attendance_records" to "authenticated";

grant update on table "public"."attendance_records" to "authenticated";

grant delete on table "public"."attendance_records" to "service_role";

grant insert on table "public"."attendance_records" to "service_role";

grant references on table "public"."attendance_records" to "service_role";

grant select on table "public"."attendance_records" to "service_role";

grant trigger on table "public"."attendance_records" to "service_role";

grant truncate on table "public"."attendance_records" to "service_role";

grant update on table "public"."attendance_records" to "service_role";

grant delete on table "public"."audit_log" to "anon";

grant insert on table "public"."audit_log" to "anon";

grant references on table "public"."audit_log" to "anon";

grant select on table "public"."audit_log" to "anon";

grant trigger on table "public"."audit_log" to "anon";

grant truncate on table "public"."audit_log" to "anon";

grant update on table "public"."audit_log" to "anon";

grant delete on table "public"."audit_log" to "authenticated";

grant insert on table "public"."audit_log" to "authenticated";

grant references on table "public"."audit_log" to "authenticated";

grant select on table "public"."audit_log" to "authenticated";

grant trigger on table "public"."audit_log" to "authenticated";

grant truncate on table "public"."audit_log" to "authenticated";

grant update on table "public"."audit_log" to "authenticated";

grant delete on table "public"."audit_log" to "service_role";

grant insert on table "public"."audit_log" to "service_role";

grant references on table "public"."audit_log" to "service_role";

grant select on table "public"."audit_log" to "service_role";

grant trigger on table "public"."audit_log" to "service_role";

grant truncate on table "public"."audit_log" to "service_role";

grant update on table "public"."audit_log" to "service_role";

grant delete on table "public"."departments" to "anon";

grant insert on table "public"."departments" to "anon";

grant references on table "public"."departments" to "anon";

grant select on table "public"."departments" to "anon";

grant trigger on table "public"."departments" to "anon";

grant truncate on table "public"."departments" to "anon";

grant update on table "public"."departments" to "anon";

grant delete on table "public"."departments" to "authenticated";

grant insert on table "public"."departments" to "authenticated";

grant references on table "public"."departments" to "authenticated";

grant select on table "public"."departments" to "authenticated";

grant trigger on table "public"."departments" to "authenticated";

grant truncate on table "public"."departments" to "authenticated";

grant update on table "public"."departments" to "authenticated";

grant delete on table "public"."departments" to "service_role";

grant insert on table "public"."departments" to "service_role";

grant references on table "public"."departments" to "service_role";

grant select on table "public"."departments" to "service_role";

grant trigger on table "public"."departments" to "service_role";

grant truncate on table "public"."departments" to "service_role";

grant update on table "public"."departments" to "service_role";

grant delete on table "public"."employee_profiles" to "anon";

grant insert on table "public"."employee_profiles" to "anon";

grant references on table "public"."employee_profiles" to "anon";

grant select on table "public"."employee_profiles" to "anon";

grant trigger on table "public"."employee_profiles" to "anon";

grant truncate on table "public"."employee_profiles" to "anon";

grant update on table "public"."employee_profiles" to "anon";

grant delete on table "public"."employee_profiles" to "authenticated";

grant insert on table "public"."employee_profiles" to "authenticated";

grant references on table "public"."employee_profiles" to "authenticated";

grant select on table "public"."employee_profiles" to "authenticated";

grant trigger on table "public"."employee_profiles" to "authenticated";

grant truncate on table "public"."employee_profiles" to "authenticated";

grant update on table "public"."employee_profiles" to "authenticated";

grant delete on table "public"."employee_profiles" to "service_role";

grant insert on table "public"."employee_profiles" to "service_role";

grant references on table "public"."employee_profiles" to "service_role";

grant select on table "public"."employee_profiles" to "service_role";

grant trigger on table "public"."employee_profiles" to "service_role";

grant truncate on table "public"."employee_profiles" to "service_role";

grant update on table "public"."employee_profiles" to "service_role";

grant delete on table "public"."memberships" to "anon";

grant insert on table "public"."memberships" to "anon";

grant references on table "public"."memberships" to "anon";

grant select on table "public"."memberships" to "anon";

grant trigger on table "public"."memberships" to "anon";

grant truncate on table "public"."memberships" to "anon";

grant update on table "public"."memberships" to "anon";

grant delete on table "public"."memberships" to "authenticated";

grant insert on table "public"."memberships" to "authenticated";

grant references on table "public"."memberships" to "authenticated";

grant select on table "public"."memberships" to "authenticated";

grant trigger on table "public"."memberships" to "authenticated";

grant truncate on table "public"."memberships" to "authenticated";

grant update on table "public"."memberships" to "authenticated";

grant delete on table "public"."memberships" to "service_role";

grant insert on table "public"."memberships" to "service_role";

grant references on table "public"."memberships" to "service_role";

grant select on table "public"."memberships" to "service_role";

grant trigger on table "public"."memberships" to "service_role";

grant truncate on table "public"."memberships" to "service_role";

grant update on table "public"."memberships" to "service_role";

grant delete on table "public"."organisation_roles" to "anon";

grant insert on table "public"."organisation_roles" to "anon";

grant references on table "public"."organisation_roles" to "anon";

grant select on table "public"."organisation_roles" to "anon";

grant trigger on table "public"."organisation_roles" to "anon";

grant truncate on table "public"."organisation_roles" to "anon";

grant update on table "public"."organisation_roles" to "anon";

grant delete on table "public"."organisation_roles" to "authenticated";

grant insert on table "public"."organisation_roles" to "authenticated";

grant references on table "public"."organisation_roles" to "authenticated";

grant select on table "public"."organisation_roles" to "authenticated";

grant trigger on table "public"."organisation_roles" to "authenticated";

grant truncate on table "public"."organisation_roles" to "authenticated";

grant update on table "public"."organisation_roles" to "authenticated";

grant delete on table "public"."organisation_roles" to "service_role";

grant insert on table "public"."organisation_roles" to "service_role";

grant references on table "public"."organisation_roles" to "service_role";

grant select on table "public"."organisation_roles" to "service_role";

grant trigger on table "public"."organisation_roles" to "service_role";

grant truncate on table "public"."organisation_roles" to "service_role";

grant update on table "public"."organisation_roles" to "service_role";

grant delete on table "public"."sales_leads" to "anon";

grant insert on table "public"."sales_leads" to "anon";

grant references on table "public"."sales_leads" to "anon";

grant select on table "public"."sales_leads" to "anon";

grant trigger on table "public"."sales_leads" to "anon";

grant truncate on table "public"."sales_leads" to "anon";

grant update on table "public"."sales_leads" to "anon";

grant delete on table "public"."sales_leads" to "authenticated";

grant insert on table "public"."sales_leads" to "authenticated";

grant references on table "public"."sales_leads" to "authenticated";

grant select on table "public"."sales_leads" to "authenticated";

grant trigger on table "public"."sales_leads" to "authenticated";

grant truncate on table "public"."sales_leads" to "authenticated";

grant update on table "public"."sales_leads" to "authenticated";

grant delete on table "public"."sales_leads" to "service_role";

grant insert on table "public"."sales_leads" to "service_role";

grant references on table "public"."sales_leads" to "service_role";

grant select on table "public"."sales_leads" to "service_role";

grant trigger on table "public"."sales_leads" to "service_role";

grant truncate on table "public"."sales_leads" to "service_role";

grant update on table "public"."sales_leads" to "service_role";

grant delete on table "public"."shifts" to "anon";

grant insert on table "public"."shifts" to "anon";

grant references on table "public"."shifts" to "anon";

grant select on table "public"."shifts" to "anon";

grant trigger on table "public"."shifts" to "anon";

grant truncate on table "public"."shifts" to "anon";

grant update on table "public"."shifts" to "anon";

grant delete on table "public"."shifts" to "authenticated";

grant insert on table "public"."shifts" to "authenticated";

grant references on table "public"."shifts" to "authenticated";

grant select on table "public"."shifts" to "authenticated";

grant trigger on table "public"."shifts" to "authenticated";

grant truncate on table "public"."shifts" to "authenticated";

grant update on table "public"."shifts" to "authenticated";

grant delete on table "public"."shifts" to "service_role";

grant insert on table "public"."shifts" to "service_role";

grant references on table "public"."shifts" to "service_role";

grant select on table "public"."shifts" to "service_role";

grant trigger on table "public"."shifts" to "service_role";

grant truncate on table "public"."shifts" to "service_role";

grant update on table "public"."shifts" to "service_role";

grant delete on table "public"."sites" to "anon";

grant insert on table "public"."sites" to "anon";

grant references on table "public"."sites" to "anon";

grant select on table "public"."sites" to "anon";

grant trigger on table "public"."sites" to "anon";

grant truncate on table "public"."sites" to "anon";

grant update on table "public"."sites" to "anon";

grant delete on table "public"."sites" to "authenticated";

grant insert on table "public"."sites" to "authenticated";

grant references on table "public"."sites" to "authenticated";

grant select on table "public"."sites" to "authenticated";

grant trigger on table "public"."sites" to "authenticated";

grant truncate on table "public"."sites" to "authenticated";

grant update on table "public"."sites" to "authenticated";

grant delete on table "public"."sites" to "service_role";

grant insert on table "public"."sites" to "service_role";

grant references on table "public"."sites" to "service_role";

grant select on table "public"."sites" to "service_role";

grant trigger on table "public"."sites" to "service_role";

grant truncate on table "public"."sites" to "service_role";

grant update on table "public"."sites" to "service_role";

grant delete on table "public"."subscriptions" to "anon";

grant insert on table "public"."subscriptions" to "anon";

grant references on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "anon";

grant trigger on table "public"."subscriptions" to "anon";

grant truncate on table "public"."subscriptions" to "anon";

grant update on table "public"."subscriptions" to "anon";

grant delete on table "public"."subscriptions" to "authenticated";

grant insert on table "public"."subscriptions" to "authenticated";

grant references on table "public"."subscriptions" to "authenticated";

grant select on table "public"."subscriptions" to "authenticated";

grant trigger on table "public"."subscriptions" to "authenticated";

grant truncate on table "public"."subscriptions" to "authenticated";

grant update on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant references on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant trigger on table "public"."subscriptions" to "service_role";

grant truncate on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";

grant delete on table "public"."tenants" to "anon";

grant insert on table "public"."tenants" to "anon";

grant references on table "public"."tenants" to "anon";

grant select on table "public"."tenants" to "anon";

grant trigger on table "public"."tenants" to "anon";

grant truncate on table "public"."tenants" to "anon";

grant update on table "public"."tenants" to "anon";

grant delete on table "public"."tenants" to "authenticated";

grant insert on table "public"."tenants" to "authenticated";

grant references on table "public"."tenants" to "authenticated";

grant select on table "public"."tenants" to "authenticated";

grant trigger on table "public"."tenants" to "authenticated";

grant truncate on table "public"."tenants" to "authenticated";

grant update on table "public"."tenants" to "authenticated";

grant delete on table "public"."tenants" to "service_role";

grant insert on table "public"."tenants" to "service_role";

grant references on table "public"."tenants" to "service_role";

grant select on table "public"."tenants" to "service_role";

grant trigger on table "public"."tenants" to "service_role";

grant truncate on table "public"."tenants" to "service_role";

grant update on table "public"."tenants" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


  create policy "access_req_public_insert"
  on "public"."access_requests"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "access_req_target_admin_read"
  on "public"."access_requests"
  as permissive
  for select
  to authenticated
using (((target_tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)));



  create policy "access_req_target_admin_update"
  on "public"."access_requests"
  as permissive
  for update
  to authenticated
using (((target_tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)))
with check (((target_tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)));



  create policy "att_mgr_read"
  on "public"."attendance_records"
  as permissive
  for select
  to authenticated
using (((tenant_id = public.current_tenant_id()) AND (public.has_tenant_role('manager'::public.tenant_role) OR public.has_tenant_role('supervisor'::public.tenant_role) OR public.has_tenant_role('admin'::public.tenant_role))));



  create policy "att_mgr_verify"
  on "public"."attendance_records"
  as permissive
  for update
  to authenticated
using (((tenant_id = public.current_tenant_id()) AND (public.has_tenant_role('manager'::public.tenant_role) OR public.has_tenant_role('admin'::public.tenant_role))));



  create policy "att_self_rw"
  on "public"."attendance_records"
  as permissive
  for all
  to authenticated
using (((tenant_id = public.current_tenant_id()) AND (employee_id = public.current_user_id())))
with check (((tenant_id = public.current_tenant_id()) AND (employee_id = public.current_user_id())));



  create policy "audit_insert_self"
  on "public"."audit_log"
  as permissive
  for insert
  to authenticated
with check (((user_id = public.current_user_id()) AND ((tenant_id IS NULL) OR (tenant_id = public.current_tenant_id()))));



  create policy "audit_self_read"
  on "public"."audit_log"
  as permissive
  for select
  to authenticated
using ((user_id = public.current_user_id()));



  create policy "audit_tenant_admin_read"
  on "public"."audit_log"
  as permissive
  for select
  to authenticated
using (((tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)));



  create policy "departments_admin_write"
  on "public"."departments"
  as permissive
  for all
  to authenticated
using (((tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)))
with check (((tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)));



  create policy "departments_tenant_read"
  on "public"."departments"
  as permissive
  for select
  to authenticated
using ((tenant_id = public.current_tenant_id()));



  create policy "emp_profiles_admin_all"
  on "public"."employee_profiles"
  as permissive
  for all
  to authenticated
using (((tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)))
with check (((tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)));



  create policy "emp_profiles_mgr_read"
  on "public"."employee_profiles"
  as permissive
  for select
  to authenticated
using (((tenant_id = public.current_tenant_id()) AND (public.has_tenant_role('manager'::public.tenant_role) OR public.has_tenant_role('supervisor'::public.tenant_role))));



  create policy "emp_profiles_self_read"
  on "public"."employee_profiles"
  as permissive
  for select
  to authenticated
using (((tenant_id = public.current_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.id = employee_profiles.membership_id) AND (m.user_id = public.current_user_id()))))));



  create policy "emp_profiles_self_update"
  on "public"."employee_profiles"
  as permissive
  for update
  to authenticated
using (((tenant_id = public.current_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.id = employee_profiles.membership_id) AND (m.user_id = public.current_user_id()))))));


DROP POLICY IF EXISTS "Tenant active members can read" ON public.memberships;

CREATE POLICY "Tenant active members can read"
ON public.memberships
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  status = 'active'::public.membership_status AND EXISTS (
    SELECT 1 FROM public.memberships m2
    WHERE m2.tenant_id = memberships.tenant_id 
      AND m2.user_id = public.current_user_id() 
      AND m2.status = 'active'::public.membership_status
  )
);

  create policy "memberships_admin_write"
  on "public"."memberships"
  as permissive
  for all
  to authenticated
using (((tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)))
with check (((tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)));



  create policy "memberships_tenant_read"
  on "public"."memberships"
  as permissive
  for select
  to authenticated
using ((tenant_id = public.current_tenant_id()));



  create policy "tenant_admin_write"
  on "public"."memberships"
  as permissive
  for all
  to authenticated
using (((tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)))
with check (((tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)));



  create policy "org_roles_admin_write"
  on "public"."organisation_roles"
  as permissive
  for all
  to authenticated
using (((tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)))
with check (((tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)));



  create policy "org_roles_tenant_read"
  on "public"."organisation_roles"
  as permissive
  for select
  to authenticated
using ((tenant_id = public.current_tenant_id()));



  create policy "leads_platform_admin_read"
  on "public"."sales_leads"
  as permissive
  for select
  to authenticated
using (((((auth.jwt() -> 'app_metadata'::text) ->> 'platform_admin'::text))::boolean IS TRUE));



  create policy "leads_public_insert"
  on "public"."sales_leads"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "shifts_admin_write"
  on "public"."shifts"
  as permissive
  for all
  to authenticated
using (((tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)))
with check (((tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)));



  create policy "shifts_tenant_read"
  on "public"."shifts"
  as permissive
  for select
  to authenticated
using ((tenant_id = public.current_tenant_id()));



  create policy "sites_admin_write"
  on "public"."sites"
  as permissive
  for all
  to authenticated
using (((tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)))
with check (((tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)));



  create policy "sites_tenant_read"
  on "public"."sites"
  as permissive
  for select
  to authenticated
using ((tenant_id = public.current_tenant_id()));



  create policy "subs_tenant_read"
  on "public"."subscriptions"
  as permissive
  for select
  to authenticated
using ((tenant_id = public.current_tenant_id()));



  create policy "tenants_admin_update"
  on "public"."tenants"
  as permissive
  for update
  to authenticated
using (((id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)))
with check (((id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)));



  create policy "tenants_member_read"
  on "public"."tenants"
  as permissive
  for select
  to authenticated
using ((id = public.current_tenant_id()));



  create policy "users_self_read"
  on "public"."users"
  as permissive
  for select
  to authenticated
using ((id = public.current_user_id()));



  create policy "users_tenant_admin_read"
  on "public"."users"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.user_id = users.id) AND (m.tenant_id = public.current_tenant_id()) AND public.has_tenant_role('admin'::public.tenant_role)))));


CREATE TRIGGER trg_att_audit AFTER INSERT OR UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.audit_log_insert();

CREATE TRIGGER trg_att_tenant_match BEFORE INSERT ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.assert_tenant_match();

CREATE TRIGGER trg_att_updated BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_emp_profiles_updated BEFORE UPDATE ON public.employee_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER defensive_set_tenant_id BEFORE INSERT ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.defensive_set_tenant_id();

CREATE TRIGGER trg_mem_audit AFTER INSERT OR UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.audit_log_insert();

CREATE TRIGGER trg_memberships_seat_cap BEFORE INSERT ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.enforce_seat_cap();

CREATE TRIGGER trg_memberships_updated BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_org_roles_audit AFTER INSERT OR UPDATE ON public.organisation_roles FOR EACH ROW EXECUTE FUNCTION public.audit_log_insert();

CREATE TRIGGER trg_sites_audit AFTER INSERT OR UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.audit_log_insert();

CREATE TRIGGER trg_sites_updated BEFORE UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


