// Shared error-to-Response mapping for API route handlers. Auth failures
// surface with their carried HTTP status; Zod validation issues return 400.
import { ZodError } from 'zod'
import { AuthError } from '@/integrations/auth0/middleware.server'

export function toJsonError(err: unknown): Response {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status })
  }
  if (err instanceof ZodError) {
    return Response.json({ error: 'Invalid input', details: err.issues }, { status: 400 })
  }
  const message = err instanceof Error ? err.message : 'Internal error'
  return Response.json({ error: message }, { status: 400 })
}
