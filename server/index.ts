import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'

import createRouter from './routes/create.js'
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

// 1. Public Endpoints
app.use(createRouter)
app.use(tenantLookupRouter)

// 2. Privileged Administrative Actions
app.use(employeesRouter)
app.use(accessRequestsRouter)

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

app.listen(PORT, () => {
  console.log(`🚀 EasyOps API Server running on port ${PORT}`)
})
