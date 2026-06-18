import './lib/load-env.js'
import app from './app.js'
import { getPool } from './lib/db.js'

// Standalone Node entrypoint. Used by `npm run server:dev` for local
// development and by any non-serverless host (Render, Railway, a VM, etc.).
const PORT = Number(process.env.API_PORT ?? 3001)

const server = app.listen(PORT, () => {
  console.log(`🚀 EasyOps API Server running on port ${PORT}`)
})

// Graceful Shutdown
function shutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`)
  server.close(async () => {
    console.log('Closed HTTP server.')

    // Close the PostgreSQL connection pool
    try {
      const pool = getPool()
      await pool.end()
      console.log('Closed PostgreSQL connection pool.')
    } catch (err) {
      console.error('Error during PostgreSQL pool closure:', err)
    }

    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
