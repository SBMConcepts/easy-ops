// Client-safe permission constants. Mirrors the `public.app_permission` enum
// and the Auth0 API permissions.
export const PERMISSIONS = {
  TenantRead: 'read:tenant',
  TenantWrite: 'write:tenant',
  TenantAdmin: 'admin:tenant',
  MembersRead: 'read:members',
  MembersInvite: 'invite:members',
  MembersManage: 'manage:members',
  AttendanceRead: 'read:attendance',
  AttendanceWrite: 'write:attendance',
  AttendanceVerify: 'verify:attendance',
  DepartmentsManage: 'manage:departments',
  SitesManage: 'manage:sites',
  ShiftsManage: 'manage:shifts',
  RolesManage: 'manage:roles',
  AuditRead: 'read:audit',
  BillingManage: 'manage:billing',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const TENANT_ROLES = ['owner', 'admin', 'manager', 'supervisor', 'employee'] as const
export type TenantRole = (typeof TENANT_ROLES)[number]
