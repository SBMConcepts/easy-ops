// Standalone server entry — used for local development (`npm run server:dev`)
// and any non-Vercel deployment. On Vercel the Express app is imported directly
// by api/index.ts as a serverless function (env injected by the platform), so
// this file is not executed.
import dotenv from 'dotenv'

// Load env BEFORE importing the app: app.ts mounts express-openid-connect at
// module-evaluation time, which reads AUTH0_SECRET/CLIENT_ID/etc. from
// process.env. `.env.local` takes precedence; `.env` fills any gaps.
dotenv.config({ path: '.env.local' })
dotenv.config()

const { default: app } = await import('./app.js')

const PORT = Number(process.env.PORT ?? 3000)

app.listen(PORT, () => {
  console.log(`EasyOps API listening on http://localhost:${PORT}`)
})
