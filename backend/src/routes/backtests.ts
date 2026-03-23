import { Router, type Request, type Response } from 'express'
import { prisma } from '../db/client.js'
import { ALLOWED_SYMBOLS, validateDateRange } from '../db/validation.js'
import { getStrategy } from '../engine/strategies/index.js'
import { executeAndPersist } from '../services/backtest-runner.js'
import type { BacktestConfig } from '../engine/types.js'

export const backtestRoutes = Router()

// ---------------------------------------------------------------------------
// POST /api/backtests – run a new backtest
// ---------------------------------------------------------------------------

interface RunBacktestBody {
  symbols: string[]
  startDate: string
  endDate: string
  strategyId: string
  params: Record<string, number>
  costModel?: {
    enabled?: boolean
    commissionPerTrade?: number
    slippageBps?: number
  }
  initialCapital?: number
}

backtestRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as RunBacktestBody
    const errors = await validateRunRequest(body)
    if (errors.length > 0) {
      res.status(400).json({ error: 'Validation failed', details: errors })
      return
    }

    const config = buildConfig(body)
    const id = await executeAndPersist(config)
    res.status(201).json({ id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    res.status(500).json({ error: message })
  }
})

// ---------------------------------------------------------------------------
// GET /api/backtests – paginated history
// ---------------------------------------------------------------------------

backtestRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    const offset = (page - 1) * limit

    const [backtests, total] = await Promise.all([
      prisma.backtest.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: { metrics: true },
      }),
      prisma.backtest.count(),
    ])

    res.json({
      backtests: backtests.map(formatBacktestSummary),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    res.status(500).json({ error: message })
  }
})

// ---------------------------------------------------------------------------
// GET /api/backtests/:id – full metadata + metrics + config
// ---------------------------------------------------------------------------

backtestRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const bt = await prisma.backtest.findUnique({
      where: { id },
      include: { metrics: true },
    })

    if (!bt) {
      res.status(404).json({ error: 'Backtest not found' })
      return
    }

    res.json(formatBacktestDetail(bt))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    res.status(500).json({ error: message })
  }
})

// ---------------------------------------------------------------------------
// GET /api/backtests/:id/equity – equity & drawdown series
// ---------------------------------------------------------------------------

backtestRoutes.get('/:id/equity', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const exists = await prisma.backtest.findUnique({ where: { id } })
    if (!exists) {
      res.status(404).json({ error: 'Backtest not found' })
      return
    }

    const equity = await prisma.backtestEquity.findMany({
      where: { backtestId: id },
      orderBy: { date: 'asc' },
      select: { date: true, equity: true, drawdown: true },
    })

    res.json({ equity })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    res.status(500).json({ error: message })
  }
})

// ---------------------------------------------------------------------------
// GET /api/backtests/:id/trades – trade list
// ---------------------------------------------------------------------------

backtestRoutes.get('/:id/trades', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const exists = await prisma.backtest.findUnique({ where: { id } })
    if (!exists) {
      res.status(404).json({ error: 'Backtest not found' })
      return
    }

    const trades = await prisma.backtestTrade.findMany({
      where: { backtestId: id },
      orderBy: { entryDate: 'asc' },
      select: {
        symbol: true,
        entryDate: true,
        exitDate: true,
        entryPrice: true,
        exitPrice: true,
        pnl: true,
        returnPct: true,
      },
    })

    res.json({ trades })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    res.status(500).json({ error: message })
  }
})

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

async function validateRunRequest(body: RunBacktestBody): Promise<string[]> {
  const errors: string[] = []

  // Symbols
  if (!Array.isArray(body.symbols) || body.symbols.length === 0) {
    errors.push('symbols must be a non-empty array')
  } else {
    for (const s of body.symbols) {
      if (!(ALLOWED_SYMBOLS as readonly string[]).includes(s)) {
        errors.push(`Symbol "${s}" is not allowed. Allowed: ${ALLOWED_SYMBOLS.join(', ')}`)
      }
    }
    if (new Set(body.symbols).size !== body.symbols.length) {
      errors.push('Duplicate symbols are not allowed')
    }
  }

  // Date range
  if (!body.startDate || !body.endDate) {
    errors.push('startDate and endDate are required (YYYY-MM-DD)')
  } else {
    const start = new Date(body.startDate)
    const end = new Date(body.endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      errors.push('startDate and endDate must be valid dates')
    } else if (errors.length === 0) {
      const rangeResult = await validateDateRange(body.symbols, start, end)
      if (!rangeResult.valid) errors.push(rangeResult.error!)
    }
  }

  // Strategy
  if (!body.strategyId) {
    errors.push('strategyId is required')
  } else {
    const entry = getStrategy(body.strategyId)
    if (!entry) {
      errors.push(`Unknown strategy: "${body.strategyId}"`)
    } else if (body.params && typeof body.params === 'object') {
      for (const pd of entry.params) {
        const val = body.params[pd.name]
        if (val === undefined) continue
        if (typeof val !== 'number' || isNaN(val)) {
          errors.push(`Parameter "${pd.name}" must be a number`)
          continue
        }
        if (val < pd.min || val > pd.max) {
          errors.push(`Parameter "${pd.name}" must be between ${pd.min} and ${pd.max}`)
        }
      }
    }
  }

  // Cost model bounds
  if (body.costModel) {
    const cm = body.costModel
    if (cm.commissionPerTrade !== undefined) {
      if (typeof cm.commissionPerTrade !== 'number' || cm.commissionPerTrade < 0 || cm.commissionPerTrade > 100) {
        errors.push('commissionPerTrade must be a number between 0 and 100')
      }
    }
    if (cm.slippageBps !== undefined) {
      if (typeof cm.slippageBps !== 'number' || cm.slippageBps < 0 || cm.slippageBps > 500) {
        errors.push('slippageBps must be a number between 0 and 500')
      }
    }
  }

  // Initial capital
  if (body.initialCapital !== undefined) {
    if (typeof body.initialCapital !== 'number' || body.initialCapital <= 0 || body.initialCapital > 1_000_000_000) {
      errors.push('initialCapital must be a positive number up to 1,000,000,000')
    }
  }

  return errors
}

// ---------------------------------------------------------------------------
// Config builder (fills defaults from strategy registry)
// ---------------------------------------------------------------------------

function buildConfig(body: RunBacktestBody): BacktestConfig {
  const entry = getStrategy(body.strategyId)!
  const defaults = Object.fromEntries(entry.params.map(p => [p.name, p.default]))
  const params = { ...defaults, ...body.params }

  return {
    symbols: body.symbols,
    startDate: new Date(body.startDate),
    endDate: new Date(body.endDate),
    strategy: { id: body.strategyId, params },
    costModel: {
      enabled: body.costModel?.enabled ?? false,
      commissionPerTrade: body.costModel?.commissionPerTrade ?? 0,
      slippageBps: body.costModel?.slippageBps ?? 0,
    },
    initialCapital: body.initialCapital ?? 10_000,
  }
}

// ---------------------------------------------------------------------------
// Response formatters
// ---------------------------------------------------------------------------

function formatBacktestSummary(bt: any) {
  return {
    id: bt.id,
    createdAt: bt.createdAt,
    strategy: bt.strategy,
    symbols: bt.symbols,
    startDate: bt.startDate,
    endDate: bt.endDate,
    initialCapital: bt.initialCapital,
    status: bt.status,
    metrics: bt.metrics
      ? {
          totalReturn: bt.metrics.totalReturn,
          cagr: bt.metrics.cagr,
          sharpe: bt.metrics.sharpe,
          maxDrawdown: bt.metrics.maxDrawdown,
          numTrades: bt.metrics.numTrades,
        }
      : null,
  }
}

function formatBacktestDetail(bt: any) {
  return {
    id: bt.id,
    createdAt: bt.createdAt,
    strategy: bt.strategy,
    symbols: bt.symbols,
    startDate: bt.startDate,
    endDate: bt.endDate,
    params: bt.params,
    costModel: bt.costModel,
    initialCapital: bt.initialCapital,
    status: bt.status,
    metrics: bt.metrics
      ? {
          totalReturn: bt.metrics.totalReturn,
          cagr: bt.metrics.cagr,
          sharpe: bt.metrics.sharpe,
          volatility: bt.metrics.volatility,
          maxDrawdown: bt.metrics.maxDrawdown,
          winRate: bt.metrics.winRate,
          profitFactor: bt.metrics.profitFactor,
          numTrades: bt.metrics.numTrades,
        }
      : null,
  }
}
