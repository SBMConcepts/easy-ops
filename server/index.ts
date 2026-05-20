import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import registerRouter from './routes/register.js'
import attendanceRouter from './routes/attendance.js'

const app = express()
const PORT = Number(process.env.API_PORT ?? 3001)

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(
  cors({
    // In production set VITE_APP_URL to your deployed frontend URL
    origin: process.env.VITE_APP_URL ?? 'http://localhost:5173',
    allowedHeaders: ['Authorization', 'Content-Type', 'x-tenant-slug'],
  })
)
app.use(express.json())

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth/register', registerRouter)
app.use('/api/auth/attendance', attendanceRouter)

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
