DO$$
BEGIN
  DECLARE v_tables text [] := array [
    'organizations', 'users', 'user_credentials', 'org_departments', 'org_sites',
    'org_roles', 'org_shifts', 'org_members', 'subscriptions', 'invitations',
    'audit_logs', 'org_attendance', 'org_leave_balances', 'labour_forecasts',
    'labour_alerts', 'payroll_export_runs', 'support_tickets', 'support_messages',
    'csm_assignments', 'safety_checklist_templates', 'safety_checklist_responses',
    'incident_reports'
  ];
v_table text;
v_count bigint;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
IF to_regclass('public.' || quote_ident(v_table)) IS NULL THEN raise exception 'postflight: table public.% is missing',
v_table;
END
IF;

IF NOT EXISTS (
  SELECT 1
FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = v_table
  AND c.relrowsecurity = true
) THEN raise exception 'postflight: rls is not enabled ON public.%',
v_table;
END
IF;

IF NOT EXISTS (
  SELECT 1
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = v_table
) THEN raise exception 'postflight: public.% has rls enabled but no policies',
v_table;
END
IF;
  END LOOP;
END$$;