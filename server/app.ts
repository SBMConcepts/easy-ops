import express, { Request, Response } from 'express'
import cors from 'cors'
import { auth } from 'express-openid-connect'

// ── Routers ─────────────────────────────────────────────────────────────────
// Grouped by access tier. Each router declares its own absolute `/api/...`
// paths, so they are mounted at the root. Import order mirrors the mount order
// below so the wiring reads top-to-bottom.

// 1. Public (pre-auth / intake) — no token required
import organizationsRouter from './routes/organizations.js'
import orgLookupRouter from './routes/org-lookup.js'

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
// Same-origin deployment (frontend + /api on one domain on Vercel; the Vite dev
// proxy mirrors this locally), so credentialed CORS is only needed if a
// cross-origin VITE_APP_URL is configured. `credentials: true` lets the browser
// send the session cookie when it is.
app.use(
  cors({
    origin: process.env.VITE_APP_URL ?? 'http://localhost:5173',
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'x-api-key'],
  })
)

// ── Auth0 OIDC session (Regular Web App / confidential client) ───────────────
// Runs the Authorization Code exchange server-side and stores the session in an
// encrypted cookie. Mounts `/api/callback` and `/api/logout`; the login route is
// custom (below) so we can forward the Auth0 Organization + invitation params.
// `req.oidc` is attached to every request (authRequired:false = opt-in gating).
const oidcBaseURL =
  process.env.OIDC_BASE_URL ??
  process.env.BASE_URL ??
  process.env.APP_URL ??
  'http://localhost:5173'
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
      // Custom login route forwards organization/invitation (see below).
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

app.use(express.json())

// Liveness/health probe.
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Custom login: forward Auth0 Organization id + invitation ticket into the
// server-side Authorization Code flow, then return the user to the workspace.
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

// 2. Identity-provider webhook (x-api-key)
app.use(authSyncRouter)

// 3. Authenticated, org-scoped (OIDC session)
app.use(supabaseTokenRouter)
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
