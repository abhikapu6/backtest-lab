import { Router } from 'express'
import { getAllStrategies } from '../engine/strategies/index.js'

export const strategyRoutes = Router()

strategyRoutes.get('/', (_req, res) => {
  const strategies = getAllStrategies().map(({ fn: _fn, ...rest }) => rest)
  res.json({ strategies })
})
