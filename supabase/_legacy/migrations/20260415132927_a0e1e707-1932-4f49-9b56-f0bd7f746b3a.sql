DROP POLICY "System insert audit logs" ON public.audit_log;

CREATE POLICY "Authenticated users insert audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);