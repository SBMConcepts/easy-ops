-- Increment D: bind Supabase RLS to the same fine-grained permission scopes
-- that Express enforces (server/lib/permissions.ts) and that the Post-Login
-- Action injects into the minted supabase_jwt as a `permissions` claim.
--
-- Approach: keep the existing tenant-isolation shape (active org_members row in
-- the same org, plus org_id() where already used) but replace each policy's
-- hard-coded role-array check (om.role = ANY(ARRAY[...])) with
-- public.has_permission('<resource:action>'). The scope list is authoritative
-- from the JWT, so Express and Postgres now authorize on identical scopes.
--
-- The `users` table INSERT/UPDATE/DELETE policies are intentionally left
-- role-based: those writes flow through the service-role Express endpoints
-- (which bypass RLS), and docs/permissions.txt exposes `users` as read-only to
-- the authenticated client, so no write:users / delete:users scope exists.

-- ─────────────────────────────────────────────────────────────────────────────
-- has_permission(): true when the caller's JWT `permissions` array contains the
-- given scope. STABLE + reads only the request JWT, so it is safe in policies.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.has_permission(permission text)
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'permissions') ? permission, false);
$$;

-- ───────────────────────────── audit_logs ──────────────────────────────────
drop policy if exists "audit_logs: org members can insert" on "public"."audit_logs";
create policy "audit_logs: org members can insert"
  on "public"."audit_logs" as permissive for insert to public
with check (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = audit_logs.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:audit_logs')
  AND (auth0_user_id = (auth.jwt() ->> 'sub'::text)));

drop policy if exists "audit_logs: owners/admin can delete" on "public"."audit_logs";
create policy "audit_logs: owners/admin can delete"
  on "public"."audit_logs" as permissive for delete to public
using (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = audit_logs.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('delete:audit_logs'));

drop policy if exists "audit_logs: owners/admin can select" on "public"."audit_logs";
create policy "audit_logs: owners/admin can select"
  on "public"."audit_logs" as permissive for select to public
using (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = audit_logs.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('read:audit_logs'));

-- ───────────────────────────── invitations ─────────────────────────────────
drop policy if exists "invitations: owners/admin can delete" on "public"."invitations";
create policy "invitations: owners/admin can delete"
  on "public"."invitations" as permissive for delete to public
using (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = invitations.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('delete:invitations'));

drop policy if exists "invitations: owners/admin can insert" on "public"."invitations";
create policy "invitations: owners/admin can insert"
  on "public"."invitations" as permissive for insert to public
with check (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = invitations.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:invitations'));

drop policy if exists "invitations: owners/admin can select" on "public"."invitations";
create policy "invitations: owners/admin can select"
  on "public"."invitations" as permissive for select to public
using (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = invitations.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('read:invitations'));

drop policy if exists "invitations: owners/admin can update" on "public"."invitations";
create policy "invitations: owners/admin can update"
  on "public"."invitations" as permissive for update to public
using (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = invitations.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:invitations'))
with check (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = invitations.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:invitations'));

-- ──────────────────────────── org_attendance ───────────────────────────────
drop policy if exists "org_attendance: delete for owners/admin" on "public"."org_attendance";
create policy "org_attendance: delete for owners/admin"
  on "public"."org_attendance" as permissive for delete to public
using (
  (auth0_org_id = public.org_id())
  AND (auth0_user_id = (auth.jwt() ->> 'sub'::text))
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = org_attendance.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('delete:org_attendance'));

drop policy if exists "org_attendance: insert for owners/admin/managers" on "public"."org_attendance";
create policy "org_attendance: insert for owners/admin/managers"
  on "public"."org_attendance" as permissive for insert to public
with check (
  (auth0_org_id = public.org_id())
  AND (auth0_user_id = (auth.jwt() ->> 'sub'::text))
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = org_attendance.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:org_attendance'));

drop policy if exists "org_attendance: select for members" on "public"."org_attendance";
create policy "org_attendance: select for members"
  on "public"."org_attendance" as permissive for select to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = org_attendance.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('read:org_attendance'));

drop policy if exists "org_attendance: update for owners/admin/managers" on "public"."org_attendance";
create policy "org_attendance: update for owners/admin/managers"
  on "public"."org_attendance" as permissive for update to public
using (
  (auth0_org_id = public.org_id())
  AND (auth0_user_id = (auth.jwt() ->> 'sub'::text))
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = org_attendance.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:org_attendance'))
with check (
  (auth0_org_id = public.org_id())
  AND (auth0_user_id = (auth.jwt() ->> 'sub'::text))
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = org_attendance.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:org_attendance'));

-- ──────────────────────────── org_departments ──────────────────────────────
drop policy if exists "org_departments: members read" on "public"."org_departments";
create policy "org_departments: members read"
  on "public"."org_departments" as permissive for select to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = org_departments.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('read:org_departments'));

drop policy if exists "org_departments: owners/admin delete" on "public"."org_departments";
create policy "org_departments: owners/admin delete"
  on "public"."org_departments" as permissive for delete to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = org_departments.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('delete:org_departments'));

drop policy if exists "org_departments: owners/admin/managers insert" on "public"."org_departments";
create policy "org_departments: owners/admin/managers insert"
  on "public"."org_departments" as permissive for insert to public
with check (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = org_departments.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:org_departments'));

drop policy if exists "org_departments: owners/admin/managers update" on "public"."org_departments";
create policy "org_departments: owners/admin/managers update"
  on "public"."org_departments" as permissive for update to public
using (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = org_departments.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:org_departments'))
with check (
  (auth0_org_id = public.org_id())
  AND (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = org_departments.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:org_departments'));

-- ────────────────────────────── org_members ────────────────────────────────
drop policy if exists "org_members: members read" on "public"."org_members";
create policy "org_members: members read"
  on "public"."org_members" as permissive for select to public
using (
  (auth0_org_id IN ( SELECT om.auth0_org_id FROM public.org_members om
    WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text))))
  AND public.has_permission('read:org_members'));

drop policy if exists "org_members: owners/admin delete" on "public"."org_members";
create policy "org_members: owners/admin delete"
  on "public"."org_members" as permissive for delete to public
using (
  (auth0_org_id IN ( SELECT om.auth0_org_id FROM public.org_members om
    WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text))))
  AND public.has_permission('delete:org_members'));

drop policy if exists "org_members: owners/admin/managers insert" on "public"."org_members";
create policy "org_members: owners/admin/managers insert"
  on "public"."org_members" as permissive for insert to public
with check (
  (auth0_org_id IN ( SELECT om.auth0_org_id FROM public.org_members om
    WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text))))
  AND public.has_permission('write:org_members'));

drop policy if exists "org_members: owners/admin/managers update" on "public"."org_members";
create policy "org_members: owners/admin/managers update"
  on "public"."org_members" as permissive for update to public
using (
  (auth0_org_id IN ( SELECT om.auth0_org_id FROM public.org_members om
    WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text))))
  AND public.has_permission('write:org_members'))
with check (
  (auth0_org_id IN ( SELECT om.auth0_org_id FROM public.org_members om
    WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text))))
  AND public.has_permission('write:org_members'));

-- ─────────────────────────────── org_roles ─────────────────────────────────
drop policy if exists "org_roles: members read" on "public"."org_roles";
create policy "org_roles: members read"
  on "public"."org_roles" as permissive for select to public
using (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = org_roles.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('read:org_roles'));

drop policy if exists "org_roles: admin/manager/owner insert" on "public"."org_roles";
create policy "org_roles: admin/manager/owner insert"
  on "public"."org_roles" as permissive for insert to public
with check (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = org_roles.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:org_roles'));

drop policy if exists "org_roles: admin/manager/owner update" on "public"."org_roles";
create policy "org_roles: admin/manager/owner update"
  on "public"."org_roles" as permissive for update to public
using (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = org_roles.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:org_roles'))
with check (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = org_roles.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:org_roles'));

drop policy if exists "org_roles: admin/owner delete" on "public"."org_roles";
create policy "org_roles: admin/owner delete"
  on "public"."org_roles" as permissive for delete to public
using (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = org_roles.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('delete:org_roles'));

-- ────────────────────────────── organizations ──────────────────────────────
drop policy if exists "organizations: members can view own" on "public"."organizations";
create policy "organizations: members can view own"
  on "public"."organizations" as permissive for select to public
using (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = organizations.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('read:organizations'));

drop policy if exists "organizations: owners/admin can delete own" on "public"."organizations";
create policy "organizations: owners/admin can delete own"
  on "public"."organizations" as permissive for delete to public
using (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = organizations.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('delete:organizations'));

drop policy if exists "organizations: owners/admin can insert own" on "public"."organizations";
create policy "organizations: owners/admin can insert own"
  on "public"."organizations" as permissive for insert to public
with check (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = organizations.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:organizations'));

drop policy if exists "organizations: owners/admin can update own" on "public"."organizations";
create policy "organizations: owners/admin can update own"
  on "public"."organizations" as permissive for update to public
using (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = organizations.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:organizations'))
with check (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = organizations.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:organizations'));

-- ────────────────────────────── subscriptions ──────────────────────────────
drop policy if exists "subscriptions: owners/admin select" on "public"."subscriptions";
create policy "subscriptions: owners/admin select"
  on "public"."subscriptions" as permissive for select to public
using (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = subscriptions.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('read:subscriptions'));

drop policy if exists "subscriptions: owners/admin insert" on "public"."subscriptions";
create policy "subscriptions: owners/admin insert"
  on "public"."subscriptions" as permissive for insert to public
with check (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = subscriptions.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:subscriptions'));

drop policy if exists "subscriptions: owners/admin update" on "public"."subscriptions";
create policy "subscriptions: owners/admin update"
  on "public"."subscriptions" as permissive for update to public
using (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = subscriptions.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:subscriptions'))
with check (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = subscriptions.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('write:subscriptions'));

drop policy if exists "subscriptions: owners/admin delete" on "public"."subscriptions";
create policy "subscriptions: owners/admin delete"
  on "public"."subscriptions" as permissive for delete to public
using (
  (EXISTS ( SELECT 1 FROM public.org_members om
    WHERE ((om.auth0_org_id = subscriptions.auth0_org_id) AND (om.status = 'active'::text)
      AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))
  AND public.has_permission('delete:subscriptions'));

-- ───────────────────────────── user_credentials ────────────────────────────
drop policy if exists "user_credentials: members can view" on "public"."user_credentials";
create policy "user_credentials: members can view"
  on "public"."user_credentials" as permissive for select to public
using (
  (auth0_org_id IN ( SELECT om.auth0_org_id FROM public.org_members om
    WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text))))
  AND public.has_permission('read:user_credentials'));

drop policy if exists "user_credentials: owners/admin can delete" on "public"."user_credentials";
create policy "user_credentials: owners/admin can delete"
  on "public"."user_credentials" as permissive for delete to public
using (
  (auth0_org_id IN ( SELECT om.auth0_org_id FROM public.org_members om
    WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text))))
  AND public.has_permission('delete:user_credentials'));

drop policy if exists "user_credentials: owners/admin/managers can update" on "public"."user_credentials";
create policy "user_credentials: owners/admin/managers can update"
  on "public"."user_credentials" as permissive for update to public
using (
  (auth0_org_id IN ( SELECT om.auth0_org_id FROM public.org_members om
    WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text))))
  AND public.has_permission('write:user_credentials'))
with check (
  (auth0_org_id IN ( SELECT om.auth0_org_id FROM public.org_members om
    WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text))))
  AND public.has_permission('write:user_credentials'));

drop policy if exists "user_credentials: owners/admin/managers/members can insert" on "public"."user_credentials";
create policy "user_credentials: owners/admin/managers/members can insert"
  on "public"."user_credentials" as permissive for insert to public
with check (
  (auth0_org_id IN ( SELECT om.auth0_org_id FROM public.org_members om
    WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text))))
  AND public.has_permission('write:user_credentials'));

-- ──────────────────────────────── users ────────────────────────────────────
-- Only the read policy is scope-bound; users writes flow through service-role
-- Express and have no authenticated-client scope in the catalog.
drop policy if exists "users: members can view" on "public"."users";
create policy "users: members can view"
  on "public"."users" as permissive for select to public
using (
  (auth0_org_id IN ( SELECT om.auth0_org_id FROM public.org_members om
    WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text))))
  AND public.has_permission('read:users'));
