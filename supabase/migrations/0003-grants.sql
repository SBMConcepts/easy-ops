DO $
$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY [
    'organizations', 'users', 'user_credentials', 'org_departments', 'org_sites',
    'org_roles', 'org_shifts', 'org_members', 'subscriptions', 'invitations',
    'audit_logs', 'org_attendance', 'org_leave_balances', 'labour_forecasts',
    'labour_alerts', 'payroll_export_runs', 'support_tickets', 'support_messages',
    'csm_assignments', 'safety_checklist_templates', 'safety_checklist_responses',
    'incident_reports'
  ] LOOP
EXECUTE format
('revoke all ON public.%I FROM anon', v_table);
EXECUTE format
(
  'GRANT SELECT, insert, update, delete ON public.%I to authenticated',
  v_table
);
EXECUTE format
(
  'GRANT all ON public.%I to service_role',
  v_table
);
END LOOP;
END $$;
REVOKE all ON public.user_credentials
FROM authenticated;
GRANT SELECT (password_hash) ON public.user_credentials
TO authenticated;
