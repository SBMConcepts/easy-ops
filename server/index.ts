import dotenv from 'dotenv'

dotenv.config({ path: '.env' })
dotenv.config()

const { default: app } = await import('./app.js')

const PORT = Number(process.env.PORT ?? 3000)

app.listen(PORT, () => {
  console.log(`EasyOps API listening on http://localhost:${PORT}/api`)
})
