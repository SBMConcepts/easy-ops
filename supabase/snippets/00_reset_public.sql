-- =====================================================================
-- 00_reset_public.sql  —  ONE-TIME, DESTRUCTIVE
--
-- Purpose: return the `public` schema to an app-empty state so the single
-- canonical schema file (supabase/migrations/20260731_remote_schema.sql)
-- can be applied fresh and reach its exact end state (composite unique
-- keys, composite tenant FKs, enum conversions, renamed columns, RLS).
--
-- All application ROW DATA has already been exported to
-- easy-ops/server/scripts/live-data-backup.json and is re-inserted by
-- 01_reseed_data.sql AFTER the canonical file has been applied.
--
-- Run order:
--   1. this file (00_reset_public.sql)
--   2. supabase/migrations/20260731_remote_schema.sql
--   3. 01_reseed_data.sql
--
-- Idempotent: every drop is guarded with IF EXISTS / CASCADE.
-- =====================================================================

begin;

set local lock_timeout = '10s';
set local statement_timeout = '120s';
set local client_min_messages = warning;

-- ---------------------------------------------------------------------
-- legacy RBAC / RLS automation objects (pre-date the new auth0 model)
-- ---------------------------------------------------------------------
drop event trigger if exists ensure_rls cascade;

drop function if exists public.rls_auto_enable() cascade;
drop function if exists public.has_permission(text) cascade;
drop function if exists public.has_permission() cascade;
drop function if exists public.org_id() cascade;
drop function if exists public.has_tenant_role(text) cascade;
drop function if exists public.current_tenant_id() cascade;

-- ---------------------------------------------------------------------
-- application tables (CASCADE removes their policies, FKs, indexes,
-- triggers and any dependent objects in one pass)
-- ---------------------------------------------------------------------
drop table if exists
  public.audit_logs,
  public.csm_assignments,
  public.incident_reports,
  public.invitations,
  public.labour_alerts,
  public.labour_forecasts,
  public.org_attendance,
  public.org_departments,
  public.org_leave_balances,
  public.org_members,
  public.org_roles,
  public.org_shifts,
  public.org_sites,
  public.organizations,
  public.payroll_export_runs,
  public.role_permissions,
  public.safety_checklist_responses,
  public.safety_checklist_templates,
  public.subscriptions,
  public.support_messages,
  public.support_tickets,
  public.user_credentials,
  public.users
  cascade;

-- ---------------------------------------------------------------------
-- legacy enum types (the canonical file recreates its own, some under
-- different names: organization_role->org_role, organization_status->
-- org_status, subscription_plan->org_plan, check_in_method->
-- attendance_method, etc.). CASCADE is safe because the owning tables
-- were dropped above.
-- ---------------------------------------------------------------------
drop type if exists
  public.attendance_status,
  public.check_in_method,
  public.forecast_alert_severity,
  public.forecast_alert_status,
  public.forecast_alert_type,
  public.incident_severity,
  public.incident_status,
  public.incident_type,
  public.organization_role,
  public.organization_status,
  public.subscription_plan,
  public.subscription_status,
  public.support_message_author,
  public.support_ticket_category,
  public.support_ticket_priority,
  public.support_ticket_status
  cascade;

commit;
