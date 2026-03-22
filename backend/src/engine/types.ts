export interface Bar {
  symbol: string
  date: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type Signal = 'long' | 'flat'

/**
 * A strategy receives the full bar history (up to and including the current bar)
 * for a single symbol, plus the current position and strategy params.
 * Returns a signal: 'long' to hold a position, 'flat' to be out.
 */
export type StrategyFn = (
  bars: Bar[],
  position: Position | null,
  params: Record<string, number>,
) => Signal

export interface StrategyConfig {
  id: string
  params: Record<string, number>
}

export interface CostModelConfig {
  enabled: boolean
  commissionPerTrade: number
  slippageBps: number
}

export interface Position {
  symbol: string
  entryDate: Date
  entryPrice: number
  shares: number
}

export interface Trade {
  symbol: string
  entryDate: Date
  exitDate: Date
  entryPrice: number
  exitPrice: number
  shares: number
  pnl: number
  returnPct: number
}

export interface EquityPoint {
  date: Date
  equity: number
  drawdown: number
}

export interface DailyReturn {
  date: Date
  value: number
}

export interface BacktestConfig {
  symbols: string[]
  startDate: Date
  endDate: Date
  strategy: StrategyConfig
  costModel: CostModelConfig
  initialCapital: number
}

export interface BacktestResult {
  equitySeries: EquityPoint[]
  trades: Trade[]
  dailyReturns: DailyReturn[]
  finalEquity: number
}
