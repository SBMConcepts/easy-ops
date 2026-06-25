// Vercel Serverless Function entry.
//
// Vercel only auto-detects functions in the project-root `api/` directory, so
// this file MUST live here (not under src/). The rewrite in vercel.json
// (`/api/(.*)` → `/api`) funnels every API request through here while
// preserving the original URL, so the Express app — whose routers already
// declare full `/api/...` paths — matches requests exactly as it does when
// run standalone via `npm run server:dev`.
//
// An Express application instance is itself a `(req, res)` request listener,
// which is the handler signature Vercel's Node runtime expects, so it can be
// exported directly.
import app from '../server/app.js'

export default app
