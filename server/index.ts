// Standalone server entry — used for local development (`npm run server:dev`)
// and any non-Vercel deployment. On Vercel the Express app is imported directly
// by src/api/index.ts as a serverless function, so this file is not executed.
import 'dotenv/config'

import app from './app.js'

const PORT = Number(process.env.PORT ?? 3000)

app.listen(PORT, () => {
  console.log(`EasyOps API listening on http://localhost:${PORT}`)
})
