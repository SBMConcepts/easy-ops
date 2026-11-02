import { httpServerHandler } from 'cloudflare:node'
import app from '../server/app.js'

// Workers expose the Express app through a virtual port; no real socket is opened.
app.listen(3000)

export default httpServerHandler({ port: 3000 })
