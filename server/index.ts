import 'dotenv/config'
import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import registerRouter from './routes/register.js'
import attendanceRouter from './routes/attendance.js'
import auth0SyncRouter from './routes/auth0-sync.js'

const app = express()
const PORT = Number(process.env.API_PORT ?? 3001)

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(
  cors({
    // In production set VITE_APP_URL to your deployed frontend URL (e.g. your Vercel domain)
    origin: process.env.VITE_APP_URL ?? 'http://localhost:5173',
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'x-tenant-slug', // Required for multi-tenant context routing
      'x-api-key', // Required for Auth0 backend-to-backend webhooks
    ],
  })
)

// Parse incoming JSON payloads
app.use(express.json())

// ── Routes ─────────────────────────────────────────────────────────────────
// Authentication & Provisioning
app.use('/api/auth/register', registerRouter)
app.use('/api/auth/sync', auth0SyncRouter)

// Core Application Data (Protected by RLS)
app.use('/api/attendance', attendanceRouter) // Dropped the `/auth` prefix for clarity on domain logic

// ── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

// ── Global Error Handler ───────────────────────────────────────────────────
// Captures unhandled exceptions to prevent the server from crashing
// and ensures the client always receives a JSON response.
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled API Error:', err)
  res.status(500).json({ error: 'Internal Server Error' })
})

// ── Boot Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 B2B SaaS API server running on http://localhost:${PORT}`)
})
