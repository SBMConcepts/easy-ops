// Centralized error + 404 handling for the Express API.
//
// Routes already respond with explicit `{ error }` payloads for expected
// failures. These two handlers are the safety net: a JSON 404 for unmatched
// routes, and a final error middleware that catches anything thrown (including
// from async handlers, which Express 5 forwards automatically) so the process
// never leaks a stack trace to the client or crashes the request.
import type { Request, Response, NextFunction } from 'express'

// Catch-all for routes that no router matched. Mounted AFTER all routes.
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` })
}

// Express error-handling middleware — MUST keep all four arguments so Express
// recognises it as an error handler. Mounted LAST.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const message = err instanceof Error ? err.message : 'Internal server error.'
  console.error('[error-handler]', err)

  // If a route already started the response, delegate to Express' default.
  if (res.headersSent) {
    return
  }

  res.status(500).json({ error: message })
}
