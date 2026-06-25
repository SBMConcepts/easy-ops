import express, { Request, Response } from 'express'
import cors from 'cors'

// ── Routers ─────────────────────────────────────────────────────────────────
// Grouped by access tier. Each router declares its own absolute `/api/...`
// paths, so they are mounted at the root. Import order mirrors the mount order
// below so the wiring reads top-to-bottom.

// 1. Public (pre-auth / intake) — no token required
import createRouter from './routes/create.js'
import tenantLookupRouter from './routes/tenant-lookup.js'

// 2. Identity-provider webhook (Auth0 Action) — x-api-key shared-secret auth
import authSyncRouter from './routes/auth-sync.js'

// 3. Authenticated, org-scoped — JWT bearer (requireAuth/requireOrg)
import userinfoRouter from './routes/userinfo.js'
import sessionRouter from './routes/session.js'
import tenantsRouter from './routes/tenants.js'
import onboardingRouter from './routes/onboarding.js'
import sitesDepartmentsRouter from './routes/sites-departments.js'
import complianceRouter from './routes/compliance.js'

// 4. Privileged administrative — JWT bearer + admin access tier
import membersRouter from './routes/members.js'
import employeesRouter from './routes/employees.js'

import { notFoundHandler, errorHandler } from './lib/error-handler.js'

const app = express()

// Trust the reverse proxy (Vercel / Render) for correct client IP + protocol.
app.set('trust proxy', 1)

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.VITE_APP_URL ?? 'http://localhost:5173',
    allowedHeaders: ['Authorization', 'Content-Type', 'x-api-key'],
  })
)
app.use(express.json())

// Liveness/health probe.
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Route tiers ───────────────────────────────────────────────────────────────
// 1. Public endpoints (no auth)
app.use(createRouter)
app.use(tenantLookupRouter)

// 2. Identity-provider webhook (x-api-key)
app.use(authSyncRouter)

// 3. Authenticated, org-scoped (JWT)
app.use(userinfoRouter)
app.use(sessionRouter)
app.use(tenantsRouter)
app.use(onboardingRouter)
app.use(sitesDepartmentsRouter)
app.use(complianceRouter)

// 4. Privileged administrative (JWT + admin tier)
app.use(membersRouter)
app.use(employeesRouter)

// ── Fallbacks ─────────────────────────────────────────────────────────────────
// Unmatched routes + centralized error handling. Must be registered last.
app.use(notFoundHandler)
app.use(errorHandler)

export default app
