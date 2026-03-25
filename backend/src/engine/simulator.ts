import type { Bar, BacktestResult, CostModelConfig, EquityPoint, Position, Signal, StrategyFn, Trade, DailyReturn } from './types.js'
import { buyExecutionPrice, sellExecutionPrice, tradeCommission } from './cost-model.js'

/**
 * Pure simulation — no DB access, fully deterministic given inputs.
 *
 * Capital is split equally across symbols. Each symbol's allocation operates
 * independently (long-only, one position per symbol). Signals generated at
 * bar[i]'s close are executed at bar[i+1]'s open. Remaining positions are
 * force-closed at the last bar's close.
 */
export function simulate(
  barsBySymbol: Map<string, Bar[]>,
  strategyFn: StrategyFn,
  params: Record<string, number>,
  costModel: CostModelConfig,
  initialCapital: number,
): BacktestResult {
  const symbols = [...barsBySymbol.keys()]
  const empty: BacktestResult = { equitySeries: [], trades: [], dailyReturns: [], finalEquity: initialCapital }
  if (symbols.length === 0) return empty

  const commonDates = getCommonDates(barsBySymbol)
  if (commonDates.length === 0) return empty

  const barLookup = buildBarLookup(barsBySymbol)

  // Per-symbol state
  const allocations = new Map<string, number>()
  const positions = new Map<string, Position>()
  const barHistory = new Map<string, Bar[]>()
  const signals = new Map<string, Signal>()

  const allocPerSymbol = initialCapital / symbols.length
  for (const symbol of symbols) {
    allocations.set(symbol, allocPerSymbol)
    barHistory.set(symbol, [])
    signals.set(symbol, 'flat')
  }

  const equitySeries: EquityPoint[] = []
  const trades: Trade[] = []
  const dailyReturns: DailyReturn[] = []
  let peakEquity = initialCapital
  let prevEquity = initialCapital

  for (let i = 0; i < commonDates.length; i++) {
    const dateKey = commonDates[i]

    // Phase 1: execute pending orders (previous bar's signals) at today's open
    if (i > 0) {
      for (const symbol of symbols) {
        const bar = barLookup.get(symbol)!.get(dateKey)!
        const prevSignal = signals.get(symbol)!
        const position = positions.get(symbol)

        if (prevSignal === 'long' && !position) {
          executeBuy(symbol, bar, costModel, allocations, positions)
        } else if (prevSignal === 'flat' && position) {
          executeSell(symbol, bar.date, bar.open, costModel, allocations, positions, trades)
        }
      }
    }

    // Phase 1.5: intrabar stop-loss check
    const stopLossPct = costModel.stopLossPercent ?? 0
    if (stopLossPct > 0) {
      for (const symbol of symbols) {
        const position = positions.get(symbol)
        if (!position) continue
        const bar = barLookup.get(symbol)!.get(dateKey)!
        const stopPrice = position.entryPrice * (1 - stopLossPct / 100)
        if (bar.low <= stopPrice) {
          // Normal stop: fill at stopPrice. Gap-down: market already below stop → fill at open.
          const fillPrice = Math.min(bar.open, stopPrice)
          executeSell(symbol, bar.date, fillPrice, costModel, allocations, positions, trades)
          signals.set(symbol, 'flat')
        }
      }
    }

    // Phase 2: mark-to-market at close
    let equity = 0
    for (const symbol of symbols) {
      const bar = barLookup.get(symbol)!.get(dateKey)!
      const alloc = allocations.get(symbol)!
      const pos = positions.get(symbol)
      equity += alloc + (pos ? pos.shares * bar.close : 0)
    }

    peakEquity = Math.max(peakEquity, equity)
    const drawdown = peakEquity > 0 ? (equity - peakEquity) / peakEquity : 0

    equitySeries.push({ date: new Date(dateKey), equity, drawdown })

    if (i > 0) {
      dailyReturns.push({
        date: new Date(dateKey),
        value: prevEquity > 0 ? (equity - prevEquity) / prevEquity : 0,
      })
    }
    prevEquity = equity

    // Phase 3: generate signals for next-bar execution
    for (const symbol of symbols) {
      const bar = barLookup.get(symbol)!.get(dateKey)!
      const history = barHistory.get(symbol)!
      history.push(bar)

      const signal = strategyFn(history, positions.get(symbol) ?? null, params)
      signals.set(symbol, signal)
    }
  }

  // Force-close remaining positions at last bar's close
  const lastDateKey = commonDates[commonDates.length - 1]
  for (const symbol of symbols) {
    const position = positions.get(symbol)
    if (!position) continue
    const bar = barLookup.get(symbol)!.get(lastDateKey)!
    executeSell(symbol, bar.date, bar.close, costModel, allocations, positions, trades)
  }

  let finalEquity = 0
  for (const alloc of allocations.values()) finalEquity += alloc

  return { equitySeries, trades, dailyReturns, finalEquity }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function executeBuy(
  symbol: string,
  bar: Bar,
  costModel: CostModelConfig,
  allocations: Map<string, number>,
  positions: Map<string, Position>,
) {
  const execPrice = buyExecutionPrice(costModel, bar.open)
  const comm = tradeCommission(costModel)
  let alloc = allocations.get(symbol)!

  const availableCash = alloc - comm
  const shares = Math.floor(availableCash / execPrice)
  if (shares <= 0) return

  alloc -= shares * execPrice + comm
  allocations.set(symbol, alloc)
  positions.set(symbol, { symbol, entryDate: bar.date, entryPrice: execPrice, shares })
}

function executeSell(
  symbol: string,
  exitDate: Date,
  rawPrice: number,
  costModel: CostModelConfig,
  allocations: Map<string, number>,
  positions: Map<string, Position>,
  trades: Trade[],
) {
  const position = positions.get(symbol)!
  const execPrice = sellExecutionPrice(costModel, rawPrice)
  const comm = tradeCommission(costModel)
  const proceeds = position.shares * execPrice - comm

  allocations.set(symbol, allocations.get(symbol)! + proceeds)
  positions.delete(symbol)

  const costBasis = position.shares * position.entryPrice
  const pnl = proceeds - costBasis - comm // entry commission + exit commission
  trades.push({
    symbol,
    entryDate: position.entryDate,
    exitDate,
    entryPrice: position.entryPrice,
    exitPrice: execPrice,
    shares: position.shares,
    pnl,
    returnPct: costBasis > 0 ? pnl / costBasis : 0,
  })
}

function getCommonDates(barsBySymbol: Map<string, Bar[]>): string[] {
  const allDateSets = [...barsBySymbol.values()].map(
    bars => new Set(bars.map(b => b.date.toISOString())),
  )
  if (allDateSets.length === 0) return []

  const common = allDateSets.reduce((acc, set) =>
    new Set([...acc].filter(d => set.has(d))),
  )
  return [...common].sort()
}

function buildBarLookup(barsBySymbol: Map<string, Bar[]>): Map<string, Map<string, Bar>> {
  const lookup = new Map<string, Map<string, Bar>>()
  for (const [symbol, bars] of barsBySymbol) {
    const dateMap = new Map<string, Bar>()
    for (const bar of bars) dateMap.set(bar.date.toISOString(), bar)
    lookup.set(symbol, dateMap)
  }
  return lookup
}
