DO $rls$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY array [
    'organizations', 'users', 'user_credentials', 'org_departments', 'org_sites',
    'org_roles', 'org_shifts', 'org_members', 'subscriptions', 'invitations',
    'audit_logs', 'org_attendance', 'org_leave_balances', 'labour_forecasts',
    'labour_alerts', 'payroll_export_runs', 'support_tickets', 'support_messages',
    'csm_assignments', 'safety_checklist_templates', 'safety_checklist_responses',
    'incident_reports'
  ] LOOP
    EXECUTE format(
  'alter table public.%I enable row level security',
  v_table
);
END LOOP;
END $rls$;
DO $droppolicies$
DECLARE p record;
BEGIN
  FOR p IN
SELECT schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = any (
    array [
         'organizations', 'users', 'user_credentials', 'org_departments', 'org_sites',
         'org_roles', 'org_shifts', 'org_members', 'subscriptions', 'invitations',
         'audit_logs', 'org_attendance', 'org_leave_balances', 'labour_forecasts',
         'labour_alerts', 'payroll_export_runs', 'support_tickets', 'support_messages',
         'csm_assignments', 'safety_checklist_templates', 'safety_checklist_responses',
         'incident_reports'
       ]
  ) LOOP
    EXECUTE format(
    'drop policy IF exists %I ON %I.%I',
    p.policyname,
    p.schemaname,
    p.tablename
  );
END LOOP;
END $droppolicies$;
CREATE policy "organizations_select" ON public.organizations for
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
  );
CREATE policy "organizations_update" ON public.organizations FOR
UPDATE TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      SELECT auth0.is_org_admin()
    )
  ) WITH check (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
  );
CREATE policy "users_select" ON public.users FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
  );
CREATE policy "users_update" ON public.users FOR
UPDATE TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      auth0_user_id = (
        SELECT auth0.current_user_id()
      )
      OR (
        SELECT auth0.is_org_admin()
      )
    )
  ) WITH check (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
  );
CREATE policy "users_insert" ON public.users FOR
INSERT TO authenticated WITH CHECK (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      SELECT auth0.is_org_admin()
    )
  );
CREATE policy "users_delete" ON public.users FOR DELETE TO authenticated USING (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_admin()
  )
);
CREATE policy "user_credentials_select" ON public.user_credentials FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      auth0_user_id = (
        SELECT auth0.current_user_id()
      )
      OR (
        SELECT auth0.is_org_admin()
      )
    )
  );
CREATE policy "departments_select" ON public.org_departments FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
  );
CREATE policy "departments_write" ON public.org_departments FOR ALL TO authenticated USING (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_admin()
  )
) WITH check (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_admin()
  )
);
CREATE policy "sites_select" ON public.org_sites FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
  );
CREATE policy "sites_write" ON public.org_sites FOR ALL TO authenticated USING (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_admin()
  )
) WITH check (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_admin()
  )
);
CREATE policy "roles_select" ON public.org_roles FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
  );
CREATE policy "roles_write" ON public.org_roles FOR ALL TO authenticated USING (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_admin()
  )
) WITH check (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_admin()
  )
);
CREATE policy "shifts_select" ON public.org_shifts FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
  );
CREATE policy "shifts_write" ON public.org_shifts FOR ALL TO authenticated USING (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_manager()
  )
) WITH check (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_manager()
  )
);
CREATE policy "members_select" ON public.org_members FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
  );
CREATE policy "members_insert" ON public.org_members FOR
INSERT TO authenticated WITH CHECK (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      SELECT auth0.is_org_admin()
    )
  );
CREATE policy "members_update" ON public.org_members FOR
UPDATE TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      SELECT auth0.is_org_admin()
    )
  ) WITH check (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
  );
CREATE policy "members_delete" ON public.org_members FOR DELETE TO authenticated USING (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.current_role()
  ) = 'owner'
  AND auth0_user_id <> (
    SELECT auth0.current_user_id()
  )
);
CREATE policy "subscriptions_select" ON public.subscriptions FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      SELECT auth0.is_org_admin()
    )
  );
CREATE policy "invitations_select" ON public.invitations FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      SELECT auth0.is_org_admin()
    )
  );
CREATE policy "invitations_write" ON public.invitations FOR ALL TO authenticated USING (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_admin()
  )
) WITH check (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_admin()
  )
);
CREATE policy "audit_select" ON public.audit_logs FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      SELECT auth0.is_org_admin()
    )
  );
CREATE policy "audit_insert" ON public.audit_logs FOR
INSERT TO authenticated WITH CHECK (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND auth0_user_id = (
      SELECT auth0.current_user_id()
    )
  );
CREATE policy "attendance_select" ON public.org_attendance FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      auth0_user_id = (
        SELECT auth0.current_user_id()
      )
      OR (
        SELECT auth0.is_org_manager()
      )
    )
  );
CREATE policy "attendance_insert" ON public.org_attendance FOR
INSERT TO authenticated WITH CHECK (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      auth0_user_id = (
        SELECT auth0.current_user_id()
      )
      OR (
        SELECT auth0.is_org_manager()
      )
    )
  );
CREATE policy "attendance_update" ON public.org_attendance FOR
UPDATE TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      SELECT auth0.is_org_manager()
    )
  ) WITH check (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
  );
CREATE policy "attendance_delete" ON public.org_attendance FOR DELETE TO authenticated USING (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_admin()
  )
);
CREATE policy "leave_select" ON public.org_leave_balances FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      auth0_user_id = (
        SELECT auth0.current_user_id()
      )
      OR (
        SELECT auth0.is_org_manager()
      )
    )
  );
CREATE policy "leave_write" ON public.org_leave_balances FOR ALL TO authenticated USING (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_manager()
  )
) WITH check (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_manager()
  )
);
CREATE policy "forecasts_select" ON public.labour_forecasts FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      SELECT auth0.is_org_manager()
    )
  );
CREATE policy "forecasts_write" ON public.labour_forecasts FOR ALL TO authenticated USING (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_admin()
  )
) WITH check (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_admin()
  )
);
CREATE policy "alerts_select" ON public.labour_alerts FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      auth0_user_id = (
        SELECT auth0.current_user_id()
      )
      OR (
        SELECT auth0.is_org_manager()
      )
    )
  );
CREATE policy "alerts_insert" ON public.labour_alerts FOR
INSERT TO authenticated WITH CHECK (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      SELECT auth0.is_org_manager()
    )
  );
CREATE policy "alerts_update" ON public.labour_alerts FOR
UPDATE TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      SELECT auth0.is_org_manager()
    )
  ) WITH check (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
  );
CREATE policy "alerts_delete" ON public.labour_alerts FOR DELETE TO authenticated USING (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_admin()
  )
);
CREATE policy "payroll_select" ON public.payroll_export_runs FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      SELECT auth0.is_org_admin()
    )
  );
CREATE policy "payroll_insert" ON public.payroll_export_runs FOR
INSERT TO authenticated WITH CHECK (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      SELECT auth0.is_org_admin()
    )
  );
CREATE policy "tickets_select" ON public.support_tickets FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      created_by = (
        SELECT auth0.current_user_id()
      )
      OR (
        SELECT auth0.is_org_admin()
      )
    )
  );
CREATE policy "tickets_insert" ON public.support_tickets FOR
INSERT TO authenticated WITH CHECK (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND created_by = (
      SELECT auth0.current_user_id()
    )
  );
CREATE policy "tickets_update" ON public.support_tickets FOR
UPDATE TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      created_by = (
        SELECT auth0.current_user_id()
      )
      OR (
        SELECT auth0.is_org_admin()
      )
    )
  ) WITH check (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
  );
CREATE policy "messages_select" ON public.support_messages FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND is_internal = false
    AND exists (
      SELECT 1
      FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id
        AND t.auth0_org_id = (
          SELECT auth0.current_org_id()
        )
        AND (
          t.created_by = (
            SELECT auth0.current_user_id()
          )
          OR (
            SELECT auth0.is_org_admin()
          )
        )
    )
  );
CREATE policy "messages_insert" ON public.support_messages FOR
INSERT TO authenticated WITH CHECK (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND is_internal = false
    AND author_role = 'customer'
    AND author_id = (
      SELECT auth0.current_user_id()
    )
    AND exists (
      SELECT 1
      FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id
        AND t.auth0_org_id = (
          SELECT auth0.current_org_id()
        )
        AND t.status <> 'closed'
    )
  );
CREATE policy "csm_select" ON public.csm_assignments FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      SELECT auth0.is_org_admin()
    )
  );
CREATE policy "safety_templates_select" ON public.safety_checklist_templates FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
  );
CREATE policy "safety_templates_write" ON public.safety_checklist_templates FOR ALL TO authenticated USING (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_manager()
  )
) WITH check (
  auth0_org_id = (
    SELECT auth0.current_org_id()
  )
  AND (
    SELECT auth0.is_org_manager()
  )
);
CREATE policy "safety_responses_select" ON public.safety_checklist_responses FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      auth0_user_id = (
        SELECT auth0.current_user_id()
      )
      OR (
        SELECT auth0.is_org_manager()
      )
    )
  );
CREATE policy "safety_responses_insert" ON public.safety_checklist_responses FOR
INSERT TO authenticated WITH CHECK (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND auth0_user_id = (
      SELECT auth0.current_user_id()
    )
  );
CREATE policy "incidents_select" ON public.incident_reports FOR
SELECT TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      reporter_id = (
        SELECT auth0.current_user_id()
      )
      OR (
        SELECT auth0.is_org_manager()
      )
    )
  );
CREATE policy "incidents_insert" ON public.incident_reports FOR
INSERT TO authenticated WITH CHECK (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND reporter_id = (
      SELECT auth0.current_user_id()
    )
  );
CREATE policy "incidents_update" ON public.incident_reports FOR
UPDATE TO authenticated USING (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
    AND (
      SELECT auth0.is_org_manager()
    )
  ) WITH check (
    auth0_org_id = (
      SELECT auth0.current_org_id()
    )
  );
