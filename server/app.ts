import './lib/load-env.js'
import express, { Request, Response } from 'express'
import cors from 'cors'

import createRouter from './routes/create.js'
import employeesRouter from './routes/employees.js'
import accessRequestsRouter from './routes/access-requests.js'
import tenantLookupRouter from './routes/tenant-lookup.js'
import userinfoRouter from './routes/userinfo.js'
import authSyncRouter from './routes/auth-sync.js'
import sitesDepartmentsRouter from './routes/sites-departments.js'
import complianceRouter from './routes/compliance.js'
import sessionRouter from './routes/session.js'
import membersRouter from './routes/members.js'
import tenantsRouter from './routes/tenants.js'
import { notFoundHandler, errorHandler, installProcessErrorHandlers } from './lib/error-handler.js'

installProcessErrorHandlers()

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
app.use(sitesDepartmentsRouter)
app.use(complianceRouter)
app.use(sessionRouter)
app.use(tenantsRouter)

// 4. Privileged Administrative Actions
app.use(employeesRouter)
app.use(accessRequestsRouter)
app.use(membersRouter)

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Unhandled Route and Centralized Error Handling
app.use(notFoundHandler)
app.use(errorHandler)

export default app
