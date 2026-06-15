-- employee — self-service + read-only operational visibility.
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('employee', 'read:own-profile'),
  ('employee', 'update:own-profile'),
  ('employee', 'read:sites'),
  ('employee', 'read:departments'),
  ('employee', 'read:shifts'),
  ('employee', 'attendance:read'),
  ('employee', 'attendance:write'),
  ('employee', 'read:benefits')
ON CONFLICT (role, permission) DO NOTHING;

-- supervisor — employee grants + team oversight.
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('supervisor', 'read:tenant'),
  ('supervisor', 'read:own-profile'),
  ('supervisor', 'update:own-profile'),
  ('supervisor', 'read:sites'),
  ('supervisor', 'read:departments'),
  ('supervisor', 'read:shifts'),
  ('supervisor', 'attendance:read'),
  ('supervisor', 'attendance:write'),
  ('supervisor', 'read:benefits'),
  ('supervisor', 'read:members'),
  ('supervisor', 'attendance:verify'),
  ('supervisor', 'read:compliance'),
  ('supervisor', 'read:tenant-analytics')
ON CONFLICT (role, permission) DO NOTHING;

-- manager — supervisor grants + operational management.
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('manager', 'read:tenant'),
  ('manager', 'write:tenant'),
  ('manager', 'read:own-profile'),
  ('manager', 'update:own-profile'),
  ('manager', 'read:sites'),
  ('manager', 'read:departments'),
  ('manager', 'read:shifts'),
  ('manager', 'attendance:read'),
  ('manager', 'attendance:write'),
  ('manager', 'attendance:verify'),
  ('manager', 'read:benefits'),
  ('manager', 'read:members'),
  ('manager', 'invite:members'),
  ('manager', 'manage:members'),
  ('manager', 'manage:departments'),
  ('manager', 'manage:sites'),
  ('manager', 'manage:shifts'),
  ('manager', 'read:access-requests'),
  ('manager', 'approve:access-requests'),
  ('manager', 'read:compliance'),
  ('manager', 'read:reports'),
  ('manager', 'export:reports'),
  ('manager', 'read:tenant-analytics'),
  ('manager', 'read:billing'),
  ('manager', 'read:audit')
ON CONFLICT (role, permission) DO NOTHING;

-- admin — manager grants + tenant-level administration.
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('admin', 'read:tenant'),
  ('admin', 'write:tenant'),
  ('admin', 'admin:tenant'),
  ('admin', 'read:own-profile'),
  ('admin', 'update:own-profile'),
  ('admin', 'read:sites'),
  ('admin', 'read:departments'),
  ('admin', 'read:shifts'),
  ('admin', 'attendance:read'),
  ('admin', 'attendance:write'),
  ('admin', 'attendance:verify'),
  ('admin', 'read:benefits'),
  ('admin', 'manage:benefits'),
  ('admin', 'read:members'),
  ('admin', 'invite:members'),
  ('admin', 'manage:members'),
  ('admin', 'manage:roles'),
  ('admin', 'manage:departments'),
  ('admin', 'manage:sites'),
  ('admin', 'manage:shifts'),
  ('admin', 'read:access-requests'),
  ('admin', 'approve:access-requests'),
  ('admin', 'read:compliance'),
  ('admin', 'read:reports'),
  ('admin', 'export:reports'),
  ('admin', 'read:tenant-analytics'),
  ('admin', 'read:billing'),
  ('admin', 'manage:billing'),
  ('admin', 'read:audit'),
  ('admin', 'export:audit'),
  ('admin', 'manage:security'),
  ('admin', 'manage:integrations'),
  ('admin', 'read:payroll'),
  ('admin', 'manage:payroll')
ON CONFLICT (role, permission) DO NOTHING;

-- owner — DB-only superset: every permission in the enum.
INSERT INTO public.role_permissions (role, permission)
SELECT 'owner'::public.tenant_role, p
  FROM unnest(enum_range(NULL::public.app_permission)) AS p
ON CONFLICT (role, permission) DO NOTHING;