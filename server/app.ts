import express, { Request, Response } from 'express'
import cors from 'cors'

// ── Routers ─────────────────────────────────────────────────────────────────
// Grouped by access tier. Each router declares its own absolute `/api/...`
// paths, so they are mounted at the root. Import order mirrors the mount order
// below so the wiring reads top-to-bottom.

// 1. Public (pre-auth / intake) — no token required
import organizationsRouter from './routes/organizations.js'
import orgLookupRouter from './routes/org-lookup.js'

// 2. Identity-provider webhook (Auth0 Action) — x-api-key shared-secret auth
import authSyncRouter from './routes/auth-sync.js'

// 3. Authenticated, org-scoped — JWT bearer (requireAuth/requireOrg)
import userinfoRouter from './routes/userinfo.js'
import sessionRouter from './routes/session.js'
import onboardingRouter from './routes/onboarding.js'
import orgSitesRouter from './routes/org-sites.js'
import orgDepartmentsRouter from './routes/org-departments.js'
import orgRolesRouter from './routes/org-roles.js'
import orgAttendanceRouter from './routes/org-attendance.js'
import subscriptionsRouter from './routes/subscriptions.js'
import complianceRouter from './routes/compliance.js'
import userCredentialsRouter from './routes/user-credentials.js'

// 4. Privileged administrative — JWT bearer + admin access tier
import orgMembersRouter from './routes/org-members.js'
import invitationsRouter from './routes/invitations.js'

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
app.use(organizationsRouter)
app.use(orgLookupRouter)

// 2. Identity-provider webhook (x-api-key)
app.use(authSyncRouter)

// 3. Authenticated, org-scoped (JWT)
app.use(userinfoRouter)
app.use(sessionRouter)
app.use(onboardingRouter)
app.use(orgSitesRouter)
app.use(orgDepartmentsRouter)
app.use(orgRolesRouter)
app.use(orgAttendanceRouter)
app.use(subscriptionsRouter)
app.use(complianceRouter)
app.use(userCredentialsRouter)

// 4. Privileged administrative (JWT + admin tier)
app.use(orgMembersRouter)
app.use(invitationsRouter)

// ── Fallbacks ─────────────────────────────────────────────────────────────────
// Unmatched routes + centralized error handling. Must be registered last.
app.use(notFoundHandler)
app.use(errorHandler)

export default app
