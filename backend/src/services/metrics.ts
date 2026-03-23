import type { BacktestResult, DailyReturn, Trade } from '../engine/types.js'

export interface ComputedMetrics {
  totalReturn: number
  cagr: number
  sharpe: number
  volatility: number
  maxDrawdown: number
  winRate: number
  profitFactor: number
  numTrades: number
}

export function computeMetrics(result: BacktestResult, initialCapital: number): ComputedMetrics {
  const { equitySeries, trades, dailyReturns, finalEquity } = result

  // Total return
  const totalReturn = initialCapital > 0
    ? (finalEquity - initialCapital) / initialCapital
    : 0

  // CAGR (annualized using trading-day count)
  const tradingDays = equitySeries.length
  const years = tradingDays / 252
  const cagr =
    years > 0 && initialCapital > 0 && finalEquity > 0
      ? Math.pow(finalEquity / initialCapital, 1 / years) - 1
      : 0

  // Risk metrics from daily returns
  const { volatility, sharpe } = riskMetrics(dailyReturns)

  // Max drawdown (most negative value in equity series, already ≤ 0)
  let maxDrawdown = 0
  for (const e of equitySeries) {
    if (e.drawdown < maxDrawdown) maxDrawdown = e.drawdown
  }

  // Trade-level metrics
  const { winRate, profitFactor } = tradeMetrics(trades)

  return {
    totalReturn,
    cagr,
    sharpe,
    volatility,
    maxDrawdown,
    winRate,
    profitFactor,
    numTrades: trades.length,
  }
}

function riskMetrics(dailyReturns: DailyReturn[]): { volatility: number; sharpe: number } {
  if (dailyReturns.length < 2) return { volatility: 0, sharpe: 0 }

  const vals = dailyReturns.map(r => r.value)
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1)
  const dailyVol = Math.sqrt(variance)

  const volatility = dailyVol * Math.sqrt(252)
  const sharpe = dailyVol > 0 ? (mean / dailyVol) * Math.sqrt(252) : 0

  return { volatility, sharpe }
}

function tradeMetrics(trades: Trade[]): { winRate: number; profitFactor: number } {
  if (trades.length === 0) return { winRate: 0, profitFactor: 0 }

  let wins = 0
  let totalWin = 0
  let totalLoss = 0

  for (const t of trades) {
    if (t.pnl > 0) {
      wins++
      totalWin += t.pnl
    } else {
      totalLoss += Math.abs(t.pnl)
    }
  }

  const winRate = wins / trades.length
  const profitFactor = totalLoss > 0
    ? totalWin / totalLoss
    : totalWin > 0 ? 999.99 : 0 // cap when no losing trades

  return { winRate, profitFactor }
}
