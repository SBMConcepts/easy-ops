import { AuthContext } from './auth.js'

const roleHierarchy = {
  admin: 4,
  manager: 3,
  supervisor: 2,
  employee: 1,
}

export type AppRole = keyof typeof roleHierarchy

/**
 * Evaluates the parsed JWT role claim against the required minimum operational tier.
 */
export function hasRequiredRole(ctx: AuthContext, minimumRole: AppRole): boolean {
  const userLevel = roleHierarchy[ctx.role] || 0
  const requiredLevel = roleHierarchy[minimumRole]

  return userLevel >= requiredLevel
}
