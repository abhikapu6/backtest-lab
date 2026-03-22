import { prisma } from '../db/client.js'
import type { BacktestConfig, BacktestResult, Bar, StrategyFn } from './types.js'
import { simulate } from './simulator.js'

export type {
  Bar, Signal, StrategyFn, StrategyConfig, CostModelConfig,
  Position, Trade, EquityPoint, DailyReturn,
  BacktestConfig, BacktestResult,
  ParamDescriptor, StrategyRegistryEntry,
} from './types.js'
export { simulate } from './simulator.js'
export { buyExecutionPrice, sellExecutionPrice, tradeCommission } from './cost-model.js'
export { getStrategy, getAllStrategies } from './strategies/index.js'

export async function loadCandles(
  symbols: string[],
  startDate: Date,
  endDate: Date,
): Promise<Map<string, Bar[]>> {
  const candles = await prisma.candle.findMany({
    where: {
      symbol: { in: symbols },
      date: { gte: startDate, lte: endDate },
    },
    orderBy: [{ symbol: 'asc' }, { date: 'asc' }],
  })

  const barsBySymbol = new Map<string, Bar[]>()
  for (const symbol of symbols) barsBySymbol.set(symbol, [])

  for (const c of candles) {
    barsBySymbol.get(c.symbol)?.push({
      symbol: c.symbol,
      date: c.date,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: Number(c.volume),
    })
  }

  return barsBySymbol
}

export async function runBacktest(
  config: BacktestConfig,
  strategyFn: StrategyFn,
): Promise<BacktestResult> {
  const barsBySymbol = await loadCandles(
    config.symbols,
    config.startDate,
    config.endDate,
  )
  return simulate(
    barsBySymbol,
    strategyFn,
    config.strategy.params,
    config.costModel,
    config.initialCapital,
  )
}
