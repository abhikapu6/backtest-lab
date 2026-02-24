import { Router } from 'express'

export const backtestRoutes = Router()

backtestRoutes.get('/', (_req, res) => {
  res.json({ backtests: [] })
})

backtestRoutes.post('/', (_req, res) => {
  res.status(501).json({ error: 'Not implemented' })
})

backtestRoutes.get('/:id', (req, res) => {
  res.status(501).json({ error: 'Not implemented', id: req.params.id })
})

backtestRoutes.get('/:id/equity', (req, res) => {
  res.status(501).json({ error: 'Not implemented', id: req.params.id })
})

backtestRoutes.get('/:id/trades', (req, res) => {
  res.status(501).json({ error: 'Not implemented', id: req.params.id })
})
