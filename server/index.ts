import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'

// ── Only import the surviving administrative & lookup routes ──
import createRouter from './routes/tenants/create.js'
import employeesRouter from './routes/employees.js'
import accessRequestsRouter from './routes/access-requests.js'
import tenantLookupRouter from './routes/tenant-lookup.js'

const app = express()
const PORT = Number(process.env.API_PORT ?? 3001)

app.use(
  cors({
    origin: process.env.VITE_APP_URL ?? 'http://localhost:5173',
    allowedHeaders: ['Authorization', 'Content-Type'],
  })
)

app.use(express.json())

// ── Routes ─────────────────────────────────────────────────────────────────

// 1. Public & Provisioning Endpoints
// Note: createRouter defines its own full path '/api/tenants/create' internally
app.use(createRouter)
app.use('/api/tenant-lookup', tenantLookupRouter)

// 2. Privileged Administrative Actions (Requires Auth0 JWT & Manager+ Roles)
app.use('/api/employees', employeesRouter)
app.use('/api/access-requests', accessRequestsRouter)

// ── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

app.listen(PORT, () => {
  console.log(`🚀 EasyOps Secure API Server running on port ${PORT}`)
})
