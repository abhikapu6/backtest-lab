import { Router } from 'express'

export const strategyRoutes = Router()

strategyRoutes.get('/', (_req, res) => {
  res.json({ strategies: [] })
})
