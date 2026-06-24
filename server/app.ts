import express, { Request, Response } from 'express'
import cors from 'cors'

import createRouter from './routes/create.js'
import tenantLookupRouter from './routes/tenant-lookup.js'
import userinfoRouter from './routes/userinfo.js'
import authSyncRouter from './routes/auth-sync.js'
import sessionRouter from './routes/session.js'
import membersRouter from './routes/members.js'
import tenantsRouter from './routes/tenants.js'
import onboardingRouter from './routes/onboarding.js'

const app = express()

// Trust proxy if you are deploying behind a reverse proxy like Vercel or Render
app.set('trust proxy', 1)

app.use(
  cors({
    origin: process.env.VITE_APP_URL ?? 'http://localhost:5173',
    allowedHeaders: ['Authorization', 'Content-Type', 'x-api-key'],
  })
)

app.use(express.json())

// 1. Public Endpoints (Pre-Auth / Intake)
app.use(createRouter)
app.use(tenantLookupRouter)

// 2. Identity Provider Webhooks (Auth0 Action Triggers)
app.use(authSyncRouter)

// 3. Authenticated User Endpoints (JWT authenticated, RLS Enforced)
app.use(userinfoRouter)
app.use(sessionRouter)
app.use(tenantsRouter)
app.use(onboardingRouter)

// 4. Privileged Administrative Actions
app.use(membersRouter)

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Unhandled Route and Centralized Error Handling

export default app
