import 'dotenv/config'
import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import registerRouter from './routes/register.js'
import attendanceRouter from './routes/attendance.js'
import auth0SyncRouter from './routes/auth0-sync.js'
import employeesRouter from './routes/employees.js'
import userRouter from './routes/user.js'
import accessRequestsRouter from './routes/access-requests.js'
import tenantLookupRouter from './routes/tenant-lookup.js'

const app = express()
const PORT = Number(process.env.API_PORT ?? 3001)

app.use(
  cors({
    origin: process.env.VITE_APP_URL ?? 'http://localhost:5173',
    allowedHeaders: ['Authorization', 'Content-Type', 'x-api-key'],
  })
)

app.use(express.json())

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth/register', registerRouter)
app.use('/api/auth/sync', auth0SyncRouter)

// Public — resolves a tenant slug before auth (used by TenantContext)
app.use('/api/tenant-lookup', tenantLookupRouter)

app.use('/api/user', userRouter)
app.use('/api/employees', employeesRouter)
app.use('/api/attendance', attendanceRouter)
app.use('/api/access-requests', accessRequestsRouter)

// ── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled API Error:', err)
  res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
