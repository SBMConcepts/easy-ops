import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { auth } from 'express-openid-connect'

// 1. Public (pre-auth / intake) — no token required
import organizationsRouter from './routes/organizations.js'
import orgLookupRouter from './routes/org-lookup.js'
import demoRequestRouter from './routes/demo-request.js'

// 2. Identity-provider webhook (Auth0 Action) — x-api-key shared-secret auth
import authSyncRouter from './routes/auth-sync.js'

// 3. Authenticated, org-scoped — OIDC session (requireAuth/requireOrg)
import supabaseTokenRouter from './routes/supabase-token.js'
import userinfoRouter from './routes/userinfo.js'
import sessionRouter from './routes/session.js'
import onboardingRouter from './routes/onboarding.js'
import orgSitesRouter from './routes/org-sites.js'
import orgDepartmentsRouter from './routes/org-departments.js'
import orgRolesRouter from './routes/org-roles.js'
import orgAttendanceRouter from './routes/org-attendance.js'
import orgShiftsRouter from './routes/org-shifts.js'
import orgRosterShiftsRouter from './routes/org-roster-shifts.js'
import orgLeaveRouter from './routes/org-leave.js'
import subscriptionsRouter from './routes/subscriptions.js'
import complianceRouter from './routes/compliance.js'
import labourForecastingRouter from './routes/labour-forecasting.js'
import payrollExportRouter from './routes/payroll-export.js'
import supportRouter from './routes/support.js'
import safetyRouter from './routes/safety.js'
import userCredentialsRouter from './routes/user-credentials.js'
import billingRouter, { handlePaystackWebhook } from './routes/billing.js'

// 4. Privileged administrative — JWT bearer + admin access tier
import orgMembersRouter from './routes/org-members.js'
import invitationsRouter from './routes/invitations.js'

import { notFoundHandler, errorHandler } from './lib/error-handler.js'
import { requireOperationalAccess } from './lib/auth-middleware.js'

const app = express()

// Disable ETag/conditional responses for the JSON API. Tenant data is dynamic
// and per-request; a 304 (Not Modified, empty body) on a react-query refetch
// would be treated as an error by the client's apiFetch (non-2xx). Always
// return a fresh 200 with the payload instead.
app.disable('etag')

// Belt-and-braces alongside disabling etag: explicitly tell every client/proxy
// never to cache or conditionally revalidate an API response (some CDNs/
// intermediaries can still cache a 200 GET absent an explicit header).
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.set('Cache-Control', 'no-store')
  next()
})

// Trust the reverse proxy (Vercel / Render) for correct client IP + protocol.
app.set('trust proxy', 1)

app.use(
  cors({
    origin: process.env.VITE_APP_URL ?? 'http://localhost:5173',
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'x-api-key'],
  })
)

const oidcBaseURL =
  process.env.OIDC_BASE_URL ??
  process.env.BASE_URL ??
  process.env.APP_URL ??
  'http://localhost:3000'
const auth0Issuer = `https://${(process.env.AUTH0_DOMAIN ?? '')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')}`

app.use(
  auth({
    authRequired: false,
    auth0Logout: true,
    secret: process.env.AUTH0_SECRET,
    baseURL: oidcBaseURL,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    issuerBaseURL: auth0Issuer,
    authorizationParams: {
      response_type: 'code',
      audience: process.env.AUTH0_AUDIENCE,
      scope: 'openid profile email',
    },
    routes: {
      login: false,
      callback: '/api/callback',
      logout: '/api/logout',
      postLogoutRedirect: oidcBaseURL,
    },
    session: {
      rolling: true,
      cookie: { sameSite: 'Lax' },
    },
  })
)

// Paystack signs the unmodified request bytes, so its webhook must consume the
// raw body before the JSON parser. All other API routes use parsed JSON below.
app.post(
  '/api/billing/webhooks/paystack',
  express.raw({ type: 'application/json' }),
  handlePaystackWebhook
)

app.use(express.json())

// Liveness/health probe.
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/login', (req: Request, res: Response) => {
  const { organization, invitation, returnTo } = req.query
  void res.oidc.login({
    returnTo: typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : '/app',
    authorizationParams: {
      ...(typeof organization === 'string' ? { organization } : {}),
      ...(typeof invitation === 'string' ? { invitation } : {}),
    },
  })
})

// ── Route tiers ───────────────────────────────────────────────────────────────
// 1. Public endpoints (no auth)
app.use(organizationsRouter)
app.use(orgLookupRouter)
app.use(demoRequestRouter)

// 2. Identity-provider webhook (x-api-key)
app.use(authSyncRouter)

// 3. Authenticated, org-scoped (OIDC session)
app.use(supabaseTokenRouter)
app.use(userinfoRouter)
app.use(sessionRouter)
app.use(onboardingRouter)
app.use(subscriptionsRouter)
app.use(billingRouter)

// Let an administrator invite the initial team after completing onboarding,
// before a paid plan's payment setup activates operational access. The route
// still verifies the caller's permission and the organization's active status.
app.use(invitationsRouter)

// Keep recovery routes above this point. Every remaining mounted API is an
// operational feature and therefore requires a free, active, or live trial
// entitlement in addition to its own authentication/permission middleware.
app.use('/api', requireOperationalAccess)
app.use(orgSitesRouter)
app.use(orgDepartmentsRouter)
app.use(orgRolesRouter)
app.use(orgAttendanceRouter)
app.use(orgShiftsRouter)
app.use(orgRosterShiftsRouter)
app.use(orgLeaveRouter)
app.use(complianceRouter)
app.use(labourForecastingRouter)
app.use(payrollExportRouter)
app.use(supportRouter)
app.use(safetyRouter)
app.use(userCredentialsRouter)

// 4. Privileged administrative (JWT + admin tier)
app.use(orgMembersRouter)

// ── Fallbacks ─────────────────────────────────────────────────────────────────
// Unmatched routes + centralized error handling. Must be registered last.
app.use(notFoundHandler)
app.use(errorHandler)

export default app
