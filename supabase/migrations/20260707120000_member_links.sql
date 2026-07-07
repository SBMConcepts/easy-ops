-- Link org_members to org_departments, org_sites and org_roles, and stamp the
-- department/site onto each org_attendance row (inherited from the member's
-- assignment at check-in). Also repurpose org_roles as free-form job titles
-- (name text + optional base_role access-tier mapping).
--
-- All FKs use ON DELETE SET NULL so deleting a department/site/role clears the
-- assignment rather than cascading away members or attendance history. The
-- org_attendance -> org_members composite FK uses ON DELETE CASCADE: attendance
-- has no meaning without the membership it belongs to.

-- ── org_roles: free-form job titles ─────────────────────────────────────────
-- `name` was the organization_role enum (owner|admin|manager|member). Convert
-- to free-form text so orgs can define arbitrary job titles, add an optional
-- base_role that maps a title down to an access tier, and enforce per-org
-- case-insensitive uniqueness on the title.
alter table "public"."org_roles" alter column "name" type text using "name"::text;

alter table "public"."org_roles" add column "base_role" text;

alter table "public"."org_roles" add constraint "org_roles_base_role_check"
  check (base_role is null or base_role = any (array['owner'::text, 'admin'::text, 'manager'::text, 'member'::text])) not valid;
alter table "public"."org_roles" validate constraint "org_roles_base_role_check";

create unique index org_roles_org_name_key on public.org_roles using btree (auth0_org_id, lower(name));

-- ── org_members: department / site / job-title assignment ───────────────────
alter table "public"."org_members" add column "department_id" uuid;
alter table "public"."org_members" add column "site_id" uuid;
alter table "public"."org_members" add column "job_role_id" uuid;

alter table "public"."org_members" add constraint "org_members_department_id_fkey"
  foreign key (department_id) references public.org_departments(id) on delete set null not valid;
alter table "public"."org_members" validate constraint "org_members_department_id_fkey";

alter table "public"."org_members" add constraint "org_members_site_id_fkey"
  foreign key (site_id) references public.org_sites(id) on delete set null not valid;
alter table "public"."org_members" validate constraint "org_members_site_id_fkey";

alter table "public"."org_members" add constraint "org_members_job_role_id_fkey"
  foreign key (job_role_id) references public.org_roles(id) on delete set null not valid;
alter table "public"."org_members" validate constraint "org_members_job_role_id_fkey";

create index org_members_department_id_idx on public.org_members using btree (department_id);
create index org_members_site_id_idx on public.org_members using btree (site_id);
create index org_members_job_role_id_idx on public.org_members using btree (job_role_id);

-- ── org_attendance: dept/site stamped at check-in + link back to member ─────
alter table "public"."org_attendance" add column "department_id" uuid;
alter table "public"."org_attendance" add column "site_id" uuid;

alter table "public"."org_attendance" add constraint "org_attendance_department_id_fkey"
  foreign key (department_id) references public.org_departments(id) on delete set null not valid;
alter table "public"."org_attendance" validate constraint "org_attendance_department_id_fkey";

alter table "public"."org_attendance" add constraint "org_attendance_site_id_fkey"
  foreign key (site_id) references public.org_sites(id) on delete set null not valid;
alter table "public"."org_attendance" validate constraint "org_attendance_site_id_fkey";

create index org_attendance_department_id_idx on public.org_attendance using btree (department_id);
create index org_attendance_site_id_idx on public.org_attendance using btree (site_id);

-- Composite FK: every attendance row must belong to an existing membership in
-- the same org. org_members has UNIQUE(auth0_org_id, auth0_user_id)
-- (org_members_org_id_user_id_key), which is the required FK target.
alter table "public"."org_attendance" add constraint "org_attendance_member_fkey"
  foreign key (auth0_org_id, auth0_user_id)
  references public.org_members(auth0_org_id, auth0_user_id) on update cascade on delete cascade not valid;
alter table "public"."org_attendance" validate constraint "org_attendance_member_fkey";
