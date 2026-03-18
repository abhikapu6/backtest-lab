import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { backtestRoutes } from './routes/backtests.js'
import { strategyRoutes } from './routes/strategies.js'
import { getDataSummary } from './db/validation.js'

dotenv.config()

const app = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

app.use(cors())
app.use(express.json())

app.get('/api/health', async (_req, res) => {
  const data = await getDataSummary()
  res.json({ status: 'ok', timestamp: new Date().toISOString(), data })
})

app.use('/api/backtests', backtestRoutes)
app.use('/api/strategies', strategyRoutes)

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
