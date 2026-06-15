import './lib/load-env.js'
import app from './app.js'

// Standalone Node entrypoint. Used by `npm run server:dev` for local
// development and by any non-Vercel host (Render, Railway, a VM, etc.).
// On Vercel the same `app` is mounted as a serverless function via api/index.ts,
// where the platform owns the HTTP listener — so this file is NOT used there.
const PORT = Number(process.env.API_PORT ?? 3001)

app.listen(PORT, () => {
  console.log(`🚀 EasyOps API Server running on port ${PORT}`)
})
