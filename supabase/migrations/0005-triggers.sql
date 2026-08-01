BEGIN
  $$
  DECLARE v_table text;
BEGIN foreach v_table IN array [
    'organizations', 'users', 'user_credentials', 'org_departments', 'org_sites',
    'org_roles', 'org_shifts', 'org_members', 'subscriptions', 'org_attendance',
    'org_leave_balances', 'labour_alerts', 'support_tickets', 'csm_assignments',
    'safety_checklist_templates', 'incident_reports'
  ] LOOP
EXECUTE format
(
  'drop trigger IF exists trg_%s_updated_at ON public.%I',
  v_table,
  v_table
);
EXECUTE format
(
  'CREATE trigger trg_%s_updated_at
         before update ON public.%I
         for each row
         execute function public.set_updated_at()',
  v_table,
  v_table
);
END loop;
END $$;
DO $$
DECLARE r record;
v_trigger text;
BEGIN
  for r in
  SELECT *
  FROM (
    VALUES
      (
        'org_departments',
        'id',
        'org_members',
        'department_id'
      ),
      (
        'org_departments',
        'id',
        'org_attendance',
        'department_id'
      ),
      (
        'org_departments',
        'id',
        'incident_reports',
        'department_id'
      ),
      (
        'org_sites',
        'id',
        'org_members',
        'site_id'
      ),
      (
        'org_sites',
        'id',
        'org_attendance',
        'site_id'
      ),
      (
        'org_sites',
        'id',
        'safety_checklist_responses',
        'site_id'
      ),
      (
        'org_sites',
        'id',
        'incident_reports',
        'site_id'
      ),
      (
        'org_roles',
        'id',
        'org_members',
        'job_role_id'
      ),
      (
        'org_shifts',
        'id',
        'org_members',
        'shift_id'
      ),
      (
        'org_shifts',
        'id',
        'safety_checklist_responses',
        'shift_id'
      ),
      (
        'org_members',
        'auth0_user_id',
        'org_members',
        'manager_id'
      ),
      (
        'org_members',
        'id',
        'invitations',
        'accepted_member_id'
      ),
      (
        'org_members',
        'auth0_user_id',
        'invitations',
        'invited_by'
      ),
      (
        'org_members',
        'auth0_user_id',
        'labour_forecasts',
        'generated_by'
      ),
      (
        'org_members',
        'auth0_user_id',
        'labour_alerts',
        'acknowledged_by'
      ),
      (
        'org_members',
        'auth0_user_id',
        'payroll_export_runs',
        'generated_by'
      ),
      (
        'org_members',
        'auth0_user_id',
        'support_tickets',
        'created_by'
      ),
      (
        'org_members',
        'auth0_user_id',
        'safety_checklist_templates',
        'created_by'
      ),
      (
        'org_members',
        'auth0_user_id',
        'incident_reports',
        'manager_user_id'
      )
  ) AS v(parent_table, parent_key, child_table, child_col)
  LOOP v_trigger := format
  (
    'trg_%s_null_%s_%s',
    r.parent_table,
    r.child_table,
    r.child_col
  );
EXECUTE format
(
  'drop trigger IF exists %I ON public.%I',
  v_trigger,
  r.parent_table
);
EXECUTE format
(
  'CREATE trigger %I
         before delete ON public.%I
         for each row
         execute function public.tenant_null_child_ref(%L, %L, %L)',
  v_trigger,
  r.parent_table,
  r.child_table,
  r.child_col,
  r.parent_key
);
END LOOP;
END $$;

DROP trigger IF EXISTS trg_members_sync_org
ON public.org_members;
CREATE trigger trg_members_sync_org
AFTER
INSERT
  OR
UPDATE OF auth0_org_id ON public.org_members FOR EACH ROW
EXECUTE
FUNCTION
public.sync_member_org
();
DROP trigger IF EXISTS trg_audit_guard
ON public.audit_logs;
CREATE trigger trg_audit_guard BEFORE
INSERT ON public.
audit_logs
FOR
EACH
ROW
EXECUTE
FUNCTION
public.guard_audit_log
();
DROP trigger IF EXISTS trg_tickets_sla
ON public.support_tickets;
CREATE trigger trg_tickets_sla BEFORE
INSERT ON public.
support_tickets
FOR
EACH
ROW
EXECUTE
FUNCTION
public.set_ticket_sla
();

ALTER TABLE public.org_attendance
SET (fillfactor = 85);
ALTER TABLE public.labour_alerts
SET (fillfactor = 85);
ALTER TABLE public.org_members
SET (fillfactor = 90);
ALTER TABLE public.support_tickets
SET (fillfactor = 90);

ALTER TABLE public.audit_logs
SET (
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_analyze_scale_factor = 0.01
  );
ALTER TABLE public.org_attendance
SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
  );
ALTER TABLE public.safety_checklist_responses
SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
  );

ALTER TABLE public.org_attendance
ALTER COLUMN auth0_org_id
SET
STATISTICS 1000;
ALTER TABLE public.audit_logs
ALTER COLUMN auth0_org_id
SET
STATISTICS 1000;
ALTER TABLE public.org_members
ALTER COLUMN auth0_org_id
SET
STATISTICS 1000;
ALTER TABLE public.labour_alerts
ALTER COLUMN auth0_org_id
SET
STATISTICS 1000;

END $$;