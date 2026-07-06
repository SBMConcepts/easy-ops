drop policy "audit_logs: members read" on "public"."audit_logs";

drop policy "invitations: admins manage" on "public"."invitations";

drop policy "subscriptions: members read" on "public"."subscriptions";

drop policy "users: read own" on "public"."users";

alter table "public"."audit_logs" drop constraint "audit_logs_actor_user_id_fkey";

alter table "public"."audit_logs" drop constraint "audit_logs_org_id_fkey";

alter table "public"."invitations" drop constraint "invitations_org_id_fkey";

alter table "public"."org_attendance" drop constraint "org_attendance_org_id_fkey";

alter table "public"."org_attendance" drop constraint "org_attendance_user_id_fkey";

alter table "public"."subscriptions" drop constraint "subscriptions_org_id_fkey";

alter table "public"."user_credentials" drop constraint "user_credentials_auth0_org_id_key";

alter table "public"."user_credentials" drop constraint "user_credentials_auth0_org_id_key1";

alter table "public"."user_credentials" drop constraint "user_credentials_auth0_org_id_key2";

alter table "public"."user_credentials" drop constraint "user_credentials_auth0_org_id_key3";

alter table "public"."users" drop constraint "users_auth0_org_id_fkey";

alter table "public"."users" drop constraint "users_auth0_org_id_key";

alter table "public"."invitations" drop constraint "invitations_org_id_email_key";

alter table "public"."org_attendance" drop constraint "org_attendance_user_id_org_id_date_key";

drop index if exists "public"."user_credentials_auth0_org_id_key";

drop index if exists "public"."user_credentials_auth0_org_id_key1";

drop index if exists "public"."user_credentials_auth0_org_id_key2";

drop index if exists "public"."user_credentials_auth0_org_id_key3";

drop index if exists "public"."users_auth0_org_id_key";

drop index if exists "public"."audit_logs_org_id_created_at_idx";

drop index if exists "public"."invitations_org_id_email_key";

drop index if exists "public"."org_attendance_user_id_org_id_date_key";

drop index if exists "public"."subscriptions_org_id_idx";

alter type "public"."subscription_plan" rename to "subscription_plan__old_version_to_be_dropped";

create type "public"."subscription_plan" as enum ('free', 'growth', 'pro', 'enterprise', 'starter');

drop type "public"."subscription_plan__old_version_to_be_dropped";

alter table "public"."audit_logs" drop column "actor_user_id";

alter table "public"."audit_logs" drop column "org_id";

alter table "public"."audit_logs" add column "auth0_org_id" text not null default ''::text;

alter table "public"."audit_logs" add column "auth0_user_id" text not null;

alter table "public"."invitations" drop column "org_id";

alter table "public"."invitations" add column "auth0_org_id" text not null;

alter table "public"."org_attendance" drop column "org_id";

alter table "public"."org_attendance" drop column "user_id";

alter table "public"."org_attendance" add column "auth0_org_id" text not null default ''::text;

alter table "public"."org_attendance" add column "auth0_user_id" text not null default ''::text;

alter table "public"."organizations" alter column "auth0_org_id" set default ''::text;

alter table "public"."subscriptions" drop column "org_id";

alter table "public"."subscriptions" add column "auth0_org_id" text not null default ''::text;

CREATE INDEX audit_logs_org_id_created_at_idx ON public.audit_logs USING btree (auth0_org_id, created_at DESC);

CREATE UNIQUE INDEX invitations_org_id_email_key ON public.invitations USING btree (auth0_org_id, email);

CREATE UNIQUE INDEX org_attendance_user_id_org_id_date_key ON public.org_attendance USING btree (auth0_user_id, auth0_org_id, date);

CREATE INDEX subscriptions_org_id_idx ON public.subscriptions USING btree (auth0_org_id);

alter table "public"."audit_logs" add constraint "audit_logs_auth0_org_id_fkey" FOREIGN KEY (auth0_org_id) REFERENCES public.organizations(auth0_org_id) not valid;

alter table "public"."audit_logs" validate constraint "audit_logs_auth0_org_id_fkey";

alter table "public"."audit_logs" add constraint "audit_logs_auth0_user_id_fkey" FOREIGN KEY (auth0_user_id) REFERENCES public.users(auth0_user_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."audit_logs" validate constraint "audit_logs_auth0_user_id_fkey";

alter table "public"."invitations" add constraint "invitations_auth0_org_id_fkey" FOREIGN KEY (auth0_org_id) REFERENCES public.organizations(auth0_org_id) ON DELETE CASCADE not valid;

alter table "public"."invitations" validate constraint "invitations_auth0_org_id_fkey";

alter table "public"."org_attendance" add constraint "org_attendance_auth0_org_id_fkey" FOREIGN KEY (auth0_org_id) REFERENCES public.organizations(auth0_org_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."org_attendance" validate constraint "org_attendance_auth0_org_id_fkey";

alter table "public"."org_attendance" add constraint "org_attendance_auth0_user_id_fkey" FOREIGN KEY (auth0_user_id) REFERENCES public.users(auth0_user_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."org_attendance" validate constraint "org_attendance_auth0_user_id_fkey";


alter table "public"."users" add constraint "users_auth0_org_id_fkey1" FOREIGN KEY (auth0_org_id) REFERENCES public.organizations(auth0_org_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."users" validate constraint "users_auth0_org_id_fkey1";

alter table "public"."invitations" add constraint "invitations_org_id_email_key" UNIQUE using index "invitations_org_id_email_key";

alter table "public"."org_attendance" add constraint "org_attendance_user_id_org_id_date_key" UNIQUE using index "org_attendance_user_id_org_id_date_key";


  create policy "audit_logs: org members can insert"
  on "public"."audit_logs"
  as permissive
  for insert
  to public
with check (((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = audit_logs.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'member'::text]))))) AND (auth0_user_id = (auth.jwt() ->> 'sub'::text))));



  create policy "audit_logs: owners/admin can delete"
  on "public"."audit_logs"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = audit_logs.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "audit_logs: owners/admin can select"
  on "public"."audit_logs"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = audit_logs.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "invitations: owners/admin can delete"
  on "public"."invitations"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = invitations.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "invitations: owners/admin can insert"
  on "public"."invitations"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = invitations.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "invitations: owners/admin can select"
  on "public"."invitations"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = invitations.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "invitations: owners/admin can update"
  on "public"."invitations"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = invitations.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = invitations.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "org_attendance: delete for owners/admin"
  on "public"."org_attendance"
  as permissive
  for delete
  to public
using (((auth0_org_id = public.org_id()) AND (auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = org_attendance.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));



  create policy "org_attendance: insert for owners/admin/managers"
  on "public"."org_attendance"
  as permissive
  for insert
  to public
with check (((auth0_org_id = public.org_id()) AND (auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = org_attendance.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text])))))));



  create policy "org_attendance: select for members"
  on "public"."org_attendance"
  as permissive
  for select
  to public
using (((auth0_org_id = public.org_id()) AND (EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = org_attendance.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'member'::text])))))));



  create policy "org_attendance: update for owners/admin/managers"
  on "public"."org_attendance"
  as permissive
  for update
  to public
using (((auth0_org_id = public.org_id()) AND (auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = org_attendance.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text])))))))
with check (((auth0_org_id = public.org_id()) AND (auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = org_attendance.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text])))))));



  create policy "org_departments: members read"
  on "public"."org_departments"
  as permissive
  for select
  to public
using (((auth0_org_id = public.org_id()) AND (EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = org_departments.auth0_org_id) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'member'::text])) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))));



  create policy "org_departments: owners/admin delete"
  on "public"."org_departments"
  as permissive
  for delete
  to public
using (((auth0_org_id = public.org_id()) AND (EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = org_departments.auth0_org_id) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))));



  create policy "org_departments: owners/admin/managers insert"
  on "public"."org_departments"
  as permissive
  for insert
  to public
with check (((auth0_org_id = public.org_id()) AND (EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = org_departments.auth0_org_id) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text])) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))));



  create policy "org_departments: owners/admin/managers update"
  on "public"."org_departments"
  as permissive
  for update
  to public
using (((auth0_org_id = public.org_id()) AND (EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = org_departments.auth0_org_id) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text])) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))))
with check (((auth0_org_id = public.org_id()) AND (EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = org_departments.auth0_org_id) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text])) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)))))));



  create policy "org_members: members read"
  on "public"."org_members"
  as permissive
  for select
  to public
using ((auth0_org_id IN ( SELECT om.auth0_org_id
   FROM public.org_members om
  WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'member'::text]))))));



  create policy "org_members: owners/admin delete"
  on "public"."org_members"
  as permissive
  for delete
  to public
using ((auth0_org_id IN ( SELECT om.auth0_org_id
   FROM public.org_members om
  WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "org_members: owners/admin/managers insert"
  on "public"."org_members"
  as permissive
  for insert
  to public
with check ((auth0_org_id IN ( SELECT om.auth0_org_id
   FROM public.org_members om
  WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]))))));



  create policy "org_members: owners/admin/managers update"
  on "public"."org_members"
  as permissive
  for update
  to public
using ((auth0_org_id IN ( SELECT om.auth0_org_id
   FROM public.org_members om
  WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]))))))
with check ((auth0_org_id IN ( SELECT om.auth0_org_id
   FROM public.org_members om
  WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]))))));



  create policy "org_roles: admin/manager/owner insert"
  on "public"."org_roles"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = org_roles.auth0_org_id) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text])) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text))))));



  create policy "org_roles: admin/manager/owner update"
  on "public"."org_roles"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = org_roles.auth0_org_id) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text])) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text))))))
with check ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = org_roles.auth0_org_id) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text])) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text))))));



  create policy "org_roles: admin/owner delete"
  on "public"."org_roles"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = org_roles.auth0_org_id) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text))))));



  create policy "org_roles: members read"
  on "public"."org_roles"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = org_roles.auth0_org_id) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'member'::text])) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text))))));



  create policy "organizations: members can view own"
  on "public"."organizations"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = organizations.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'member'::text]))))));



  create policy "organizations: owners/admin can delete own"
  on "public"."organizations"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = organizations.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "organizations: owners/admin can insert own"
  on "public"."organizations"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = organizations.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "organizations: owners/admin can update own"
  on "public"."organizations"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = organizations.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = organizations.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "subscriptions: owners/admin delete"
  on "public"."subscriptions"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = subscriptions.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "subscriptions: owners/admin insert"
  on "public"."subscriptions"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = subscriptions.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "subscriptions: owners/admin select"
  on "public"."subscriptions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = subscriptions.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "subscriptions: owners/admin update"
  on "public"."subscriptions"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = subscriptions.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM public.org_members om
  WHERE ((om.auth0_org_id = subscriptions.auth0_org_id) AND (om.status = 'active'::text) AND (om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "user_credentials: members can view"
  on "public"."user_credentials"
  as permissive
  for select
  to public
using ((auth0_org_id IN ( SELECT om.auth0_org_id
   FROM public.org_members om
  WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'member'::text]))))));



  create policy "user_credentials: owners/admin can delete"
  on "public"."user_credentials"
  as permissive
  for delete
  to public
using ((auth0_org_id IN ( SELECT om.auth0_org_id
   FROM public.org_members om
  WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "user_credentials: owners/admin/managers can update"
  on "public"."user_credentials"
  as permissive
  for update
  to public
using ((auth0_org_id IN ( SELECT om.auth0_org_id
   FROM public.org_members om
  WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]))))))
with check ((auth0_org_id IN ( SELECT om.auth0_org_id
   FROM public.org_members om
  WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]))))));



  create policy "user_credentials: owners/admin/managers/members can insert"
  on "public"."user_credentials"
  as permissive
  for insert
  to public
with check ((auth0_org_id IN ( SELECT om.auth0_org_id
   FROM public.org_members om
  WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'member'::text]))))));


  create policy "users: members can view"
  on "public"."users"
  as permissive
  for select
  to public
using ((auth0_org_id IN ( SELECT om.auth0_org_id
   FROM public.org_members om
  WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'member'::text]))))));



  create policy "users: owners/admin can delete"
  on "public"."users"
  as permissive
  for delete
  to public
using ((auth0_org_id IN ( SELECT om.auth0_org_id
   FROM public.org_members om
  WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));



  create policy "users: owners/admin/managers can update"
  on "public"."users"
  as permissive
  for update
  to public
using ((auth0_org_id IN ( SELECT om.auth0_org_id
   FROM public.org_members om
  WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]))))))
with check ((auth0_org_id IN ( SELECT om.auth0_org_id
   FROM public.org_members om
  WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]))))));



  create policy "users: owners/admin/managers/members can insert"
  on "public"."users"
  as permissive
  for insert
  to public
with check ((auth0_org_id IN ( SELECT om.auth0_org_id
   FROM public.org_members om
  WHERE ((om.auth0_user_id = (auth.jwt() ->> 'sub'::text)) AND (om.status = 'active'::text) AND (om.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'member'::text]))))));



