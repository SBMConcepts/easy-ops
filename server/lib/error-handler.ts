import type { Request, Response, NextFunction } from 'express'
import { renderErrorPage } from './error-page.js'

// Returns true for requests targeting the JSON API, which should receive a JSON
// error body rather than the HTML fallback page.
function wantsJson(req: Request): boolean {
  return req.path.startsWith('/api') || req.accepts(['html', 'json']) === 'json'
}

// 404 handler — mount AFTER all routers. Unknown /api routes get JSON; anything
// else gets the friendly HTML page.
export function notFoundHandler(req: Request, res: Response): void {
  if (wantsJson(req)) {
    res.status(404).json({ error: 'Not found.' })
    return
  }
  res.status(404).type('html').send(renderErrorPage())
}

// Central error handler — mount LAST. Express identifies it by its four-arg
// signature. Logs the error server-side and returns JSON for API requests or
// the HTML page otherwise. Never leaks error internals to the client.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  console.error('Unhandled request error:', err)

  if (res.headersSent) return

  if (wantsJson(req)) {
    res.status(500).json({ error: 'Internal server error.' })
    return
  }
  res.status(500).type('html').send(renderErrorPage())
}

// Process-level safety net. Logs otherwise-fatal errors so the server stays
// observable; deliberately does not exit, leaving lifecycle control to the host.
export function installProcessErrorHandlers(): void {
  process.on('uncaughtException', (error) => {
    console.error('uncaughtException:', error)
  })
  process.on('unhandledRejection', (reason) => {
    console.error('unhandledRejection:', reason)
  })
}
