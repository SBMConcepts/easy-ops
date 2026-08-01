create extension if not exists "btree_gist" with schema "extensions";

drop extension if exists "pg_net";

drop trigger if exists "trg_audit_guard" on "public"."audit_logs";

drop trigger if exists "trg_csm_assignments_updated_at" on "public"."csm_assignments";

drop trigger if exists "trg_incident_reports_updated_at" on "public"."incident_reports";

drop trigger if exists "trg_labour_alerts_updated_at" on "public"."labour_alerts";

drop trigger if exists "trg_org_attendance_updated_at" on "public"."org_attendance";

drop trigger if exists "trg_org_departments_null_incident_reports_department_id" on "public"."org_departments";

drop trigger if exists "trg_org_departments_null_org_attendance_department_id" on "public"."org_departments";

drop trigger if exists "trg_org_departments_null_org_members_department_id" on "public"."org_departments";

drop trigger if exists "trg_org_departments_updated_at" on "public"."org_departments";

drop trigger if exists "trg_org_leave_balances_updated_at" on "public"."org_leave_balances";

drop trigger if exists "trg_members_sync_org" on "public"."org_members";

drop trigger if exists "trg_org_members_null_incident_reports_manager_user_id" on "public"."org_members";

drop trigger if exists "trg_org_members_null_invitations_accepted_member_id" on "public"."org_members";

drop trigger if exists "trg_org_members_null_invitations_invited_by" on "public"."org_members";

drop trigger if exists "trg_org_members_null_labour_alerts_acknowledged_by" on "public"."org_members";

drop trigger if exists "trg_org_members_null_labour_forecasts_generated_by" on "public"."org_members";

drop trigger if exists "trg_org_members_null_org_members_manager_id" on "public"."org_members";

drop trigger if exists "trg_org_members_null_payroll_export_runs_generated_by" on "public"."org_members";

drop trigger if exists "trg_org_members_null_safety_checklist_templates_created_by" on "public"."org_members";

drop trigger if exists "trg_org_members_null_support_tickets_created_by" on "public"."org_members";

drop trigger if exists "trg_org_members_updated_at" on "public"."org_members";

drop trigger if exists "trg_org_roles_null_org_members_job_role_id" on "public"."org_roles";

drop trigger if exists "trg_org_roles_updated_at" on "public"."org_roles";

drop trigger if exists "trg_org_shifts_null_org_members_shift_id" on "public"."org_shifts";

drop trigger if exists "trg_org_shifts_null_safety_checklist_responses_shift_id" on "public"."org_shifts";

drop trigger if exists "trg_org_shifts_updated_at" on "public"."org_shifts";

drop trigger if exists "trg_org_sites_null_incident_reports_site_id" on "public"."org_sites";

drop trigger if exists "trg_org_sites_null_org_attendance_site_id" on "public"."org_sites";

drop trigger if exists "trg_org_sites_null_org_members_site_id" on "public"."org_sites";

drop trigger if exists "trg_org_sites_null_safety_checklist_responses_site_id" on "public"."org_sites";

drop trigger if exists "trg_org_sites_updated_at" on "public"."org_sites";

drop trigger if exists "trg_organizations_updated_at" on "public"."organizations";

drop trigger if exists "trg_safety_checklist_templates_updated_at" on "public"."safety_checklist_templates";

drop trigger if exists "trg_subscriptions_updated_at" on "public"."subscriptions";

drop trigger if exists "trg_support_tickets_updated_at" on "public"."support_tickets";

drop trigger if exists "trg_tickets_sla" on "public"."support_tickets";

drop trigger if exists "trg_user_credentials_updated_at" on "public"."user_credentials";

drop trigger if exists "trg_users_updated_at" on "public"."users";

drop policy "members_delete" on "public"."org_members";

drop policy "messages_insert" on "public"."support_messages";

drop policy "messages_select" on "public"."support_messages";

alter table "public"."audit_logs" drop constraint "audit_logs_actor_fkey";

alter table "public"."audit_logs" drop constraint "audit_logs_org_fkey";

alter table "public"."csm_assignments" drop constraint "csm_assignments_org_fkey";

alter table "public"."incident_reports" drop constraint "incident_reports_department_fkey";

alter table "public"."incident_reports" drop constraint "incident_reports_manager_fkey";

alter table "public"."incident_reports" drop constraint "incident_reports_org_fkey";

alter table "public"."incident_reports" drop constraint "incident_reports_reporter_fkey";

alter table "public"."incident_reports" drop constraint "incident_reports_site_fkey";

alter table "public"."invitations" drop constraint "invitations_inviter_fkey";

alter table "public"."invitations" drop constraint "invitations_member_fkey";

alter table "public"."invitations" drop constraint "invitations_org_fkey";

alter table "public"."labour_alerts" drop constraint "labour_alerts_ack_fkey";

alter table "public"."labour_alerts" drop constraint "labour_alerts_forecast_fkey";

alter table "public"."labour_alerts" drop constraint "labour_alerts_member_fkey";

alter table "public"."labour_alerts" drop constraint "labour_alerts_org_fkey";

alter table "public"."labour_alerts" drop constraint "labour_alerts_site_fkey";

alter table "public"."labour_forecasts" drop constraint "labour_forecasts_generator_fkey";

alter table "public"."labour_forecasts" drop constraint "labour_forecasts_org_fkey";

alter table "public"."labour_forecasts" drop constraint "labour_forecasts_site_fkey";

alter table "public"."org_attendance" drop constraint "org_attendance_department_fkey";

alter table "public"."org_attendance" drop constraint "org_attendance_member_fkey";

alter table "public"."org_attendance" drop constraint "org_attendance_site_fkey";

alter table "public"."org_members" drop constraint "org_members_department_fkey";

alter table "public"."org_members" drop constraint "org_members_job_role_fkey";

alter table "public"."org_members" drop constraint "org_members_manager_fkey";

alter table "public"."org_members" drop constraint "org_members_manager_id_chk";

alter table "public"."org_members" drop constraint "org_members_org_fkey";

alter table "public"."org_members" drop constraint "org_members_shift_fkey";

alter table "public"."org_members" drop constraint "org_members_site_fkey";

alter table "public"."org_members" drop constraint "org_members_user_first_name_chk";

alter table "public"."org_members" drop constraint "org_members_user_fkey";

alter table "public"."org_members" drop constraint "org_members_user_full_name_chk";

alter table "public"."org_members" drop constraint "org_members_user_last_name_chk";

alter table "public"."org_roles" drop constraint "org_roles_org_fkey";

alter table "public"."org_shifts" drop constraint "org_shifts_org_fkey";

alter table "public"."org_sites" drop constraint "org_sites_department_fkey";``

alter table "public"."org_sites" drop constraint "org_sites_org_fkey";

alter table "public"."payroll_export_runs" drop constraint "payroll_export_runs_generator_fkey";

alter table "public"."payroll_export_runs" drop constraint "payroll_export_runs_org_fkey";

alter table "public"."safety_checklist_responses" drop constraint "safety_responses_member_fkey";

alter table "public"."safety_checklist_responses" drop constraint "safety_responses_org_fkey";

alter table "public"."safety_checklist_responses" drop constraint "safety_responses_shift_fkey";

alter table "public"."safety_checklist_responses" drop constraint "safety_responses_site_fkey";

alter table "public"."safety_checklist_responses" drop constraint "safety_responses_template_fkey";

alter table "public"."safety_checklist_templates" drop constraint "safety_templates_creator_fkey";

alter table "public"."safety_checklist_templates" drop constraint "safety_templates_org_fkey";

alter table "public"."subscriptions" drop constraint "subscriptions_org_fkey";

alter table "public"."support_tickets" drop constraint "support_tickets_creator_fkey";

alter table "public"."support_tickets" drop constraint "support_tickets_org_fkey";

alter table "public"."user_credentials" drop constraint "user_credentials_user_fkey";

alter table "public"."users" drop constraint "users_org_fkey";

alter table "public"."labour_alerts" drop constraint "labour_alerts_ack_chk";

alter table "public"."org_departments" drop constraint "org_departments_org_fkey";

alter table "public"."org_leave_balances" drop constraint "org_leave_balances_member_fkey";

alter table "public"."org_members" drop constraint "org_members_no_self_manage";

alter table "public"."org_members" drop constraint "org_members_user_org_key";

alter table "public"."organizations" drop constraint "organizations_name_chk";

alter table "public"."safety_checklist_templates" drop constraint "safety_templates_name_chk";

alter table "public"."support_messages" drop constraint "support_messages_org_fkey";

alter table "public"."support_messages" drop constraint "support_messages_ticket_fkey";

alter table "public"."support_tickets" drop constraint "support_tickets_closed_chk";

drop index if exists "public"."idx_alerts_org_open";

drop index if exists "public"."idx_members_manager";

drop index if exists "public"."idx_members_site";

drop index if exists "public"."idx_tickets_sla_open";

drop index if exists "public"."org_members_user_org_key";

drop index if exists "public"."subscriptions_one_live_per_org";

alter type "public"."incident_type" rename to "incident_type__old_version_to_be_dropped";

create type "public"."incident_type" as enum ('injury', 'near_miss', 'property_damage', 'environmental', 'security', 'vehicle', 'other');

drop type "public"."incident_type__old_version_to_be_dropped";

alter table "public"."csm_assignments" alter column "csm_email" set data type extensions.citext using "csm_email"::extensions.citext;

alter table "public"."incident_reports" alter column "incident_type" set data type public.incident_type using "incident_type"::text::public.incident_type;

alter table "public"."incident_reports" alter column "severity" set data type public.incident_severity using "severity"::text::public.incident_severity;

alter table "public"."incident_reports" alter column "status" set default 'open'::public.incident_status;

alter table "public"."incident_reports" alter column "status" set data type public.incident_status using "status"::text::public.incident_status;

alter table "public"."invitations" alter column "email" set data type extensions.citext using "email"::extensions.citext;

alter table "public"."invitations" alter column "role" set default 'member'::public.org_role;

alter table "public"."invitations" alter column "role" set data type public.org_role using "role"::text::public.org_role;

alter table "public"."invitations" alter column "token" set default encode(extensions.gen_random_bytes(32), 'hex'::text);

alter table "public"."labour_alerts" alter column "alert_type" set data type public.forecast_alert_type using "alert_type"::text::public.forecast_alert_type;

alter table "public"."labour_alerts" alter column "auth0_user_id" set not null;

alter table "public"."labour_alerts" alter column "severity" set default 'medium'::public.forecast_alert_severity;

alter table "public"."labour_alerts" alter column "severity" set data type public.forecast_alert_severity using "severity"::text::public.forecast_alert_severity;

alter table "public"."labour_alerts" alter column "site_id" set not null;

alter table "public"."labour_alerts" alter column "status" set default 'open'::public.forecast_alert_status;

alter table "public"."labour_alerts" alter column "status" set data type public.forecast_alert_status using "status"::text::public.forecast_alert_status;

alter table "public"."org_attendance" alter column "method" set data type public.attendance_method using "method"::text::public.attendance_method;

alter table "public"."org_leave_balances" alter column "leave_type" set data type public.leave_type using "leave_type"::text::public.leave_type;

alter table "public"."org_members" add column "department_name" text not null default ''::text;

alter table "public"."org_members" alter column "auth0_org_id" set default ''::text;

alter table "public"."org_members" alter column "auth0_user_id" set default ''::text;

alter table "public"."org_members" alter column "employment_type" set data type public.employment_type using "employment_type"::text::public.employment_type;

alter table "public"."org_members" alter column "first_name" set default ''::text;

alter table "public"."org_members" alter column "full_name" set default ''::text;

alter table "public"."org_members" alter column "last_name" set default ''::text;

alter table "public"."org_members" alter column "manager_id" set data type uuid using "manager_id"::uuid;

alter table "public"."org_members" alter column "role" set default 'member'::public.org_role;

alter table "public"."org_members" alter column "role" set data type public.org_role using "role"::text::public.org_role;

alter table "public"."org_members" alter column "site_id" set data type text using "site_id"::text;

alter table "public"."org_members" alter column "status" set default 'active'::public.member_status;

alter table "public"."org_members" alter column "status" set data type public.member_status using "status"::text::public.member_status;

alter table "public"."org_roles" alter column "base_role" set data type public.org_role using "base_role"::text::public.org_role;

alter table "public"."organizations" alter column "plan" set default 'free'::public.org_plan;

alter table "public"."organizations" alter column "plan" set data type public.org_plan using "plan"::text::public.org_plan;

alter table "public"."organizations" alter column "status" set default 'active'::public.org_status;

alter table "public"."organizations" alter column "status" set data type public.org_status using "status"::text::public.org_status;

alter table "public"."payroll_export_runs" alter column "format" set default 'csv'::public.payroll_export_format;

alter table "public"."payroll_export_runs" alter column "format" set data type public.payroll_export_format using "format"::text::public.payroll_export_format;

alter table "public"."subscriptions" alter column "plan" set data type public.org_plan using "plan"::text::public.org_plan;

alter table "public"."subscriptions" alter column "status" set default 'trialing'::public.subscription_status;

alter table "public"."subscriptions" alter column "status" set data type public.subscription_status using "status"::text::public.subscription_status;

alter table "public"."support_messages" alter column "author_role" set default 'customer'::public.support_message_author;

alter table "public"."support_messages" alter column "author_role" set data type public.support_message_author using "author_role"::text::public.support_message_author;

alter table "public"."support_tickets" alter column "category" set default 'general'::public.support_ticket_category;

alter table "public"."support_tickets" alter column "category" set data type public.support_ticket_category using "category"::text::public.support_ticket_category;

alter table "public"."support_tickets" alter column "plan_at_creation" set data type public.org_plan using "plan_at_creation"::text::public.org_plan;

alter table "public"."support_tickets" alter column "priority" set default 'medium'::public.support_ticket_priority;

alter table "public"."support_tickets" alter column "priority" set data type public.support_ticket_priority using "priority"::text::public.support_ticket_priority;

alter table "public"."support_tickets" alter column "status" set default 'open'::public.support_ticket_status;

alter table "public"."support_tickets" alter column "status" set data type public.support_ticket_status using "status"::text::public.support_ticket_status;

alter table "public"."user_credentials" add column "address" text;

alter table "public"."user_credentials" add column "id_type" public.identification_type;

alter table "public"."user_credentials" add column "mobile_number" text default ''::text;

alter table "public"."user_credentials" add column "national_id" text;

alter table "public"."user_credentials" alter column "auth0_user_id" set default ''::text;

alter table "public"."user_credentials" alter column "email" set data type extensions.citext using "email"::extensions.citext;

alter table "public"."user_credentials" alter column "first_name" set default ''::text;

alter table "public"."user_credentials" alter column "first_name" set not null;

alter table "public"."user_credentials" alter column "full_name" set default ''::text;

alter table "public"."user_credentials" alter column "full_name" set not null;

alter table "public"."user_credentials" alter column "last_name" set default ''::text;

alter table "public"."user_credentials" alter column "last_name" set not null;

alter table "public"."user_credentials" alter column "status" set default 'active'::public.credential_status;

alter table "public"."user_credentials" alter column "status" set data type public.credential_status using "status"::text::public.credential_status;

alter table "public"."users" alter column "email" set data type extensions.citext using "email"::extensions.citext; 

alter table "public"."users" alter column "id_type" set data type public.identification_type using "id_type"::text::public.identification_type;

CREATE UNIQUE INDEX org_members_employee_code_key ON public.org_members USING btree (auth0_org_id, employee_code);

CREATE INDEX idx_alerts_org_open ON public.labour_alerts USING btree (auth0_org_id, created_at DESC) WHERE (status = 'open'::public.forecast_alert_status);

CREATE INDEX idx_members_manager ON public.org_members USING btree (manager_id, auth0_org_id);

CREATE INDEX idx_members_site ON public.org_members USING btree (site_id, auth0_org_id);

CREATE INDEX idx_tickets_sla_open ON public.support_tickets USING btree (sla_resolution_due) WHERE (status <> ALL (ARRAY['resolved'::public.support_ticket_status, 'closed'::public.support_ticket_status]));

CREATE UNIQUE INDEX org_members_user_org_key ON public.org_members USING btree (auth0_org_id, auth0_user_id);

CREATE UNIQUE INDEX subscriptions_one_live_per_org ON public.subscriptions USING btree (auth0_org_id) WHERE (status = ANY (ARRAY['trialing'::public.subscription_status, 'active'::public.subscription_status, 'past_due'::public.subscription_status]));

alter table "public"."org_members" add constraint "org_members_employee_code_key" UNIQUE using index "org_members_employee_code_key";

alter table "public"."users" add constraint "users_full_name_check" CHECK ((length(full_name) > 0)) not valid;

alter table "public"."users" validate constraint "users_full_name_check";

alter table "public"."labour_alerts" add constraint "labour_alerts_ack_chk" CHECK (((status <> 'acknowledged'::public.forecast_alert_status) OR (acknowledged_at IS NOT NULL))) not valid;

alter table "public"."labour_alerts" validate constraint "labour_alerts_ack_chk";

alter table "public"."org_departments" add constraint "org_departments_org_fkey" FOREIGN KEY (auth0_org_id) REFERENCES public.organizations(auth0_org_id) ON DELETE CASCADE not valid;

alter table "public"."org_departments" validate constraint "org_departments_org_fkey";

alter table "public"."org_leave_balances" add constraint "org_leave_balances_member_fkey" FOREIGN KEY (auth0_org_id, auth0_user_id) REFERENCES public.org_members(auth0_org_id, auth0_user_id) ON DELETE CASCADE not valid;

alter table "public"."org_leave_balances" validate constraint "org_leave_balances_member_fkey";

alter table "public"."org_members" add constraint "org_members_no_self_manage" CHECK ((manager_id IS DISTINCT FROM id)) not valid;

alter table "public"."org_members" validate constraint "org_members_no_self_manage";

alter table "public"."org_members" add constraint "org_members_user_org_key" UNIQUE using index "org_members_user_org_key";

alter table "public"."organizations" add constraint "organizations_name_chk" CHECK ((length(btrim(name)) > 0)) not valid;

alter table "public"."organizations" validate constraint "organizations_name_chk";

alter table "public"."safety_checklist_templates" add constraint "safety_templates_name_chk" CHECK ((length(btrim(name)) > 0)) not valid;

alter table "public"."safety_checklist_templates" validate constraint "safety_templates_name_chk";

alter table "public"."support_messages" add constraint "support_messages_org_fkey" FOREIGN KEY (auth0_org_id) REFERENCES public.organizations(auth0_org_id) ON DELETE CASCADE not valid;

alter table "public"."support_messages" validate constraint "support_messages_org_fkey";

alter table "public"."support_messages" add constraint "support_messages_ticket_fkey" FOREIGN KEY (ticket_id, auth0_org_id) REFERENCES public.support_tickets(id, auth0_org_id) ON DELETE CASCADE not valid;

alter table "public"."support_messages" validate constraint "support_messages_ticket_fkey";

alter table "public"."support_tickets" add constraint "support_tickets_closed_chk" CHECK (((status <> 'closed'::public.support_ticket_status) OR (closed_at IS NOT NULL))) not valid;

alter table "public"."support_tickets" validate constraint "support_tickets_closed_chk";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION auth0."current_role"()
 RETURNS public.org_role
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role public.org_role;
BEGIN
  SELECT m.role
  INTO v_role
  FROM public.org_members m
  WHERE m.auth0_user_id = auth0.current_user_id()
    AND m.auth0_org_id  = auth0.current_org_id()
    AND m.status = 'active'
  LIMIT 1;

  RETURN v_role;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_member_org()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$BEGIN
  UPDATE public.users u
  SET auth0_org_id = NEW.auth0_org_id
  WHERE u.auth0_user_id = NEW.auth0_user_id
    AND u.auth0_org_id IS DISTINCT FROM NEW.auth0_org_id;

  RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.tenant_null_child_ref()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_child_table text := tg_argv[0];
  v_child_col   text := tg_argv[1];
  v_parent_key  text := tg_argv[2];
  v_key_value   text := to_jsonb(OLD)->>tg_argv[2];
BEGIN
  IF v_key_value IS NULL THEN
    RETURN OLD;
  END IF;

  EXECUTE format(
    'UPDATE public.%I
     SET %I = NULL
     WHERE %I::text = $1
       AND auth0_org_id = $2',
    v_child_table,
    v_child_col,
    v_child_col
  )
  USING v_key_value, OLD.auth0_org_id;

  RETURN OLD;
END;
$function$
;


  create policy "members_delete"
  on "public"."org_members"
  as permissive
  for delete
  to authenticated
using (((auth0_org_id = ( SELECT auth0.current_org_id() AS current_org_id)) AND (( SELECT auth0."current_role"() AS "current_role") = 'owner'::public.org_role) AND (auth0_user_id <> ( SELECT auth0.current_user_id() AS current_user_id))));



  create policy "messages_insert"
  on "public"."support_messages"
  as permissive
  for insert
  to authenticated
with check (((auth0_org_id = ( SELECT auth0.current_org_id() AS current_org_id)) AND (is_internal = false) AND (author_role = 'customer'::public.support_message_author) AND (author_id = ( SELECT auth0.current_user_id() AS current_user_id)) AND (EXISTS ( SELECT 1
   FROM public.support_tickets t
  WHERE ((t.id = support_messages.ticket_id) AND (t.auth0_org_id = ( SELECT auth0.current_org_id() AS current_org_id)) AND (t.status <> 'closed'::public.support_ticket_status))))));



  create policy "messages_select"
  on "public"."support_messages"
  as permissive
  for select
  to authenticated
using (((auth0_org_id = ( SELECT auth0.current_org_id() AS current_org_id)) AND (is_internal = false) AND (EXISTS ( SELECT 1
   FROM public.support_tickets t
  WHERE ((t.id = support_messages.ticket_id) AND (t.auth0_org_id = ( SELECT auth0.current_org_id() AS current_org_id)) AND ((t.created_by = ( SELECT auth0.current_user_id() AS current_user_id)) OR ( SELECT auth0.is_org_admin() AS is_org_admin)))))));


CREATE TRIGGER trg_audit_guard BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.guard_audit_log();

CREATE TRIGGER trg_csm_assignments_updated_at BEFORE UPDATE ON public.csm_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_incident_reports_updated_at BEFORE UPDATE ON public.incident_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_labour_alerts_updated_at BEFORE UPDATE ON public.labour_alerts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_org_attendance_updated_at BEFORE UPDATE ON public.org_attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_org_departments_null_incident_reports_department_id BEFORE DELETE ON public.org_departments FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('incident_reports', 'department_id', 'id');

CREATE TRIGGER trg_org_departments_null_org_attendance_department_id BEFORE DELETE ON public.org_departments FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('org_attendance', 'department_id', 'id');

CREATE TRIGGER trg_org_departments_null_org_members_department_id BEFORE DELETE ON public.org_departments FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('org_members', 'department_id', 'id');

CREATE TRIGGER trg_org_departments_updated_at BEFORE UPDATE ON public.org_departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_org_leave_balances_updated_at BEFORE UPDATE ON public.org_leave_balances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_members_sync_org AFTER INSERT OR UPDATE OF auth0_org_id ON public.org_members FOR EACH ROW EXECUTE FUNCTION public.sync_member_org();

CREATE TRIGGER trg_org_members_null_incident_reports_manager_user_id BEFORE DELETE ON public.org_members FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('incident_reports', 'manager_user_id', 'auth0_user_id');

CREATE TRIGGER trg_org_members_null_invitations_accepted_member_id BEFORE DELETE ON public.org_members FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('invitations', 'accepted_member_id', 'id');

CREATE TRIGGER trg_org_members_null_invitations_invited_by BEFORE DELETE ON public.org_members FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('invitations', 'invited_by', 'auth0_user_id');

CREATE TRIGGER trg_org_members_null_labour_alerts_acknowledged_by BEFORE DELETE ON public.org_members FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('labour_alerts', 'acknowledged_by', 'auth0_user_id');

CREATE TRIGGER trg_org_members_null_labour_forecasts_generated_by BEFORE DELETE ON public.org_members FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('labour_forecasts', 'generated_by', 'auth0_user_id');

CREATE TRIGGER trg_org_members_null_org_members_manager_id BEFORE DELETE ON public.org_members FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('org_members', 'manager_id', 'auth0_user_id');

CREATE TRIGGER trg_org_members_null_payroll_export_runs_generated_by BEFORE DELETE ON public.org_members FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('payroll_export_runs', 'generated_by', 'auth0_user_id');

CREATE TRIGGER trg_org_members_null_safety_checklist_templates_created_by BEFORE DELETE ON public.org_members FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('safety_checklist_templates', 'created_by', 'auth0_user_id');

CREATE TRIGGER trg_org_members_null_support_tickets_created_by BEFORE DELETE ON public.org_members FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('support_tickets', 'created_by', 'auth0_user_id');

CREATE TRIGGER trg_org_members_updated_at BEFORE UPDATE ON public.org_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_org_roles_null_org_members_job_role_id BEFORE DELETE ON public.org_roles FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('org_members', 'job_role_id', 'id');

CREATE TRIGGER trg_org_roles_updated_at BEFORE UPDATE ON public.org_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_org_shifts_null_org_members_shift_id BEFORE DELETE ON public.org_shifts FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('org_members', 'shift_id', 'id');

CREATE TRIGGER trg_org_shifts_null_safety_checklist_responses_shift_id BEFORE DELETE ON public.org_shifts FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('safety_checklist_responses', 'shift_id', 'id');

CREATE TRIGGER trg_org_shifts_updated_at BEFORE UPDATE ON public.org_shifts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_org_sites_null_incident_reports_site_id BEFORE DELETE ON public.org_sites FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('incident_reports', 'site_id', 'id');

CREATE TRIGGER trg_org_sites_null_org_attendance_site_id BEFORE DELETE ON public.org_sites FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('org_attendance', 'site_id', 'id');

CREATE TRIGGER trg_org_sites_null_org_members_site_id BEFORE DELETE ON public.org_sites FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('org_members', 'site_id', 'id');

CREATE TRIGGER trg_org_sites_null_safety_checklist_responses_site_id BEFORE DELETE ON public.org_sites FOR EACH ROW EXECUTE FUNCTION public.tenant_null_child_ref('safety_checklist_responses', 'site_id', 'id');

CREATE TRIGGER trg_org_sites_updated_at BEFORE UPDATE ON public.org_sites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_safety_checklist_templates_updated_at BEFORE UPDATE ON public.safety_checklist_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_tickets_sla BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_ticket_sla();

CREATE TRIGGER trg_user_credentials_updated_at BEFORE UPDATE ON public.user_credentials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


  create policy "avatars: users delete own"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.jwt() ->> 'org_id'::text)) AND ((storage.foldername(name))[2] = regexp_replace((auth.jwt() ->> 'sub'::text), '[^a-zA-Z0-9_-]'::text, '_'::text, 'g'::text))));



  create policy "avatars: users update own"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.jwt() ->> 'org_id'::text)) AND ((storage.foldername(name))[2] = regexp_replace((auth.jwt() ->> 'sub'::text), '[^a-zA-Z0-9_-]'::text, '_'::text, 'g'::text))))
with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.jwt() ->> 'org_id'::text)) AND ((storage.foldername(name))[2] = regexp_replace((auth.jwt() ->> 'sub'::text), '[^a-zA-Z0-9_-]'::text, '_'::text, 'g'::text))));



  create policy "avatars: users upload own"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.jwt() ->> 'org_id'::text)) AND ((storage.foldername(name))[2] = regexp_replace((auth.jwt() ->> 'sub'::text), '[^a-zA-Z0-9_-]'::text, '_'::text, 'g'::text))));



