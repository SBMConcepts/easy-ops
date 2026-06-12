import 'dotenv/config'
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

app.use(
  cors({
    origin: process.env.VITE_APP_URL ?? 'http://localhost:5173',
    allowedHeaders: ['Authorization', 'Content-Type'],
  })
)

app.use(express.json())

// 1. Public Endpoints
app.use(createRouter)
app.use(tenantLookupRouter)

// 2. Identity Provider Webhooks (shared-secret authenticated)
app.use(authSyncRouter)

// 3. Authenticated User Endpoints (JWT authenticated)
app.use(userinfoRouter)
app.use(sitesDepartmentsRouter)
app.use(complianceRouter)
app.use(sessionRouter)
app.use(tenantsRouter)

// 4. Privileged Administrative Actions
app.use(employeesRouter)
app.use(accessRequestsRouter)
app.use(membersRouter)

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

// 404 + centralized error handling (must be registered last).
app.use(notFoundHandler)
app.use(errorHandler)

export default app
