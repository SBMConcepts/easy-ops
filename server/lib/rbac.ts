import { AuthContext, AppRole } from './auth.js'

// Automatically maps to the literal union types exported from your Database schema
const roleHierarchy: Record<AppRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  supervisor: 2,
  employee: 1,
}

export function hasRequiredRole(ctx: AuthContext, minimumRole: AppRole): boolean {
  const userLevel = roleHierarchy[ctx.role] || 0
  const requiredLevel = roleHierarchy[minimumRole]

  return userLevel >= requiredLevel
}
