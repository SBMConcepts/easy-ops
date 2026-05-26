import { AuthContext } from './auth.js'

const roleHierarchy = {
  admin: 4,
  manager: 3,
  supervisor: 2,
  employee: 1,
}

export type AppRole = keyof typeof roleHierarchy

/**
 * Checks if the user's role is greater than or equal to the required minimum role.
 */
export function hasRequiredRole(ctx: AuthContext, minimumRole: AppRole): boolean {
  const userLevel = roleHierarchy[ctx.role] || 0
  const requiredLevel = roleHierarchy[minimumRole]
  return userLevel >= requiredLevel
}
