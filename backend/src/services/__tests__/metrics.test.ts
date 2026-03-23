import { describe, it, expect } from 'vitest'
import { computeMetrics } from '../metrics.js'
import type { BacktestResult, EquityPoint, Trade, DailyReturn } from '../../engine/types.js'

// ── Helpers ───────────────────────────────────────────────────────────

function makeEquity(values: number[]): EquityPoint[] {
  let peak = -Infinity
  return values.map((equity, i) => {
    peak = Math.max(peak, equity)
    const drawdown = peak > 0 ? (equity - peak) / peak : 0
    return { date: new Date(2020, 0, i + 1), equity, drawdown }
  })
}

function makeDailyReturns(equityValues: number[]): DailyReturn[] {
  const returns: DailyReturn[] = []
  for (let i = 1; i < equityValues.length; i++) {
    returns.push({
      date: new Date(2020, 0, i + 1),
      value: (equityValues[i] - equityValues[i - 1]) / equityValues[i - 1],
    })
  }
  return returns
}

function makeTrade(pnl: number): Trade {
  return {
    symbol: 'SPY', entryDate: new Date(), exitDate: new Date(),
    entryPrice: 100, exitPrice: 100 + pnl, shares: 1, pnl, returnPct: pnl / 100,
  }
}

function makeResult(
  equityValues: number[],
  trades: Trade[] = [],
): BacktestResult {
  return {
    equitySeries: makeEquity(equityValues),
    trades,
    dailyReturns: makeDailyReturns(equityValues),
    finalEquity: equityValues[equityValues.length - 1],
  }
}

// ── totalReturn ───────────────────────────────────────────────────────

describe('computeMetrics – totalReturn', () => {
  it('is 0 when equity is unchanged', () => {
    const result = computeMetrics(makeResult([10_000, 10_000, 10_000]), 10_000)
    expect(result.totalReturn).toBeCloseTo(0)
  })

  it('is 1.0 for a 100% gain', () => {
    const result = computeMetrics(makeResult([10_000, 20_000]), 10_000)
    expect(result.totalReturn).toBeCloseTo(1.0)
  })

  it('is negative for a loss', () => {
    const result = computeMetrics(makeResult([10_000, 8_000]), 10_000)
    expect(result.totalReturn).toBeCloseTo(-0.2)
  })

  it('is 0 when initial capital is 0', () => {
    const result = computeMetrics(makeResult([0, 100]), 0)
    expect(result.totalReturn).toBe(0)
  })
})

// ── CAGR ──────────────────────────────────────────────────────────────

describe('computeMetrics – CAGR', () => {
  it('equals totalReturn for exactly 252 trading days (1 year)', () => {
    const equity = Array.from({ length: 252 }, (_, i) => 10_000 + i * (2_000 / 252))
    const result = computeMetrics(makeResult(equity), 10_000)
    expect(result.cagr).toBeCloseTo(result.totalReturn, 2)
  })

  it('is higher than totalReturn when compressed to fewer years', () => {
    // Grow $10k → $12k in 126 days (0.5 years) → CAGR annualises it upward
    const equity = Array.from({ length: 126 }, (_, i) => 10_000 + i * (2_000 / 126))
    const result = computeMetrics(makeResult(equity), 10_000)
    expect(result.cagr).toBeGreaterThan(result.totalReturn)
  })

  it('is 0 when there are no equity points', () => {
    const result = computeMetrics({ equitySeries: [], trades: [], dailyReturns: [], finalEquity: 10_000 }, 10_000)
    expect(result.cagr).toBe(0)
  })
})

// ── Sharpe & Volatility ───────────────────────────────────────────────

describe('computeMetrics – Sharpe & Volatility', () => {
  it('returns 0 Sharpe and 0 volatility with fewer than 2 daily returns', () => {
    const result = computeMetrics(makeResult([10_000]), 10_000)
    expect(result.sharpe).toBe(0)
    expect(result.volatility).toBe(0)
  })

  it('Sharpe is higher for a smoother upward equity curve', () => {
    // Smooth: constant +1% per day
    const smooth = Array.from({ length: 50 }, (_, i) => 10_000 * Math.pow(1.01, i))
    // Volatile: same final value but with large swings
    const volatile = smooth.map((v, i) => v * (1 + (i % 2 === 0 ? 0.05 : -0.04)))
    const smoothResult = computeMetrics(makeResult(smooth), 10_000)
    const volatileResult = computeMetrics(makeResult(volatile), 10_000)
    expect(smoothResult.sharpe).toBeGreaterThan(volatileResult.sharpe)
  })

  it('annualised volatility = dailyVol * sqrt(252)', () => {
    // Known daily returns: [0.01, -0.01] alternating for 10 days
    const equity: number[] = [10_000]
    for (let i = 0; i < 20; i++) equity.push(equity[equity.length - 1] * (i % 2 === 0 ? 1.01 : 0.99))
    const result = computeMetrics(makeResult(equity), 10_000)
    expect(result.volatility).toBeGreaterThan(0)
  })
})

// ── Max Drawdown ──────────────────────────────────────────────────────

describe('computeMetrics – maxDrawdown', () => {
  it('is 0 when equity never falls below peak', () => {
    const result = computeMetrics(makeResult([10_000, 11_000, 12_000, 13_000]), 10_000)
    expect(result.maxDrawdown).toBeCloseTo(0)
  })

  it('is approximately -0.5 for a 50% drawdown', () => {
    const result = computeMetrics(makeResult([10_000, 20_000, 10_000]), 10_000)
    expect(result.maxDrawdown).toBeCloseTo(-0.5, 2)
  })

  it('captures the worst drawdown, not the last one', () => {
    // Drawdown of -50% then recovery, then -10% → maxDD should be -50%
    const result = computeMetrics(makeResult([10_000, 20_000, 10_000, 18_000, 16_200]), 10_000)
    expect(result.maxDrawdown).toBeCloseTo(-0.5, 2)
  })
})

// ── Trade metrics ─────────────────────────────────────────────────────

describe('computeMetrics – trade metrics', () => {
  it('returns 0 win rate and 0 profit factor with no trades', () => {
    const result = computeMetrics(makeResult([10_000, 10_000]), 10_000)
    expect(result.winRate).toBe(0)
    expect(result.profitFactor).toBe(0)
    expect(result.numTrades).toBe(0)
  })

  it('win rate is 1.0 when all trades are profitable', () => {
    const trades = [makeTrade(100), makeTrade(200), makeTrade(50)]
    const result = computeMetrics(makeResult([10_000, 11_000], trades), 10_000)
    expect(result.winRate).toBeCloseTo(1.0)
  })

  it('win rate is 0.0 when all trades lose', () => {
    const trades = [makeTrade(-100), makeTrade(-50)]
    const result = computeMetrics(makeResult([10_000, 9_000], trades), 10_000)
    expect(result.winRate).toBeCloseTo(0.0)
  })

  it('win rate is 0.5 for equal wins and losses', () => {
    const trades = [makeTrade(100), makeTrade(-100)]
    const result = computeMetrics(makeResult([10_000, 10_000], trades), 10_000)
    expect(result.winRate).toBeCloseTo(0.5)
  })

  it('profit factor is gross win / gross loss', () => {
    const trades = [makeTrade(300), makeTrade(100), makeTrade(-200)]
    const result = computeMetrics(makeResult([10_000, 10_200], trades), 10_000)
    // gross win=400, gross loss=200 → PF=2.0
    expect(result.profitFactor).toBeCloseTo(2.0)
  })

  it('profit factor is capped at 999.99 when there are no losing trades', () => {
    const trades = [makeTrade(100), makeTrade(200)]
    const result = computeMetrics(makeResult([10_000, 10_300], trades), 10_000)
    expect(result.profitFactor).toBeCloseTo(999.99)
  })

  it('numTrades reflects the trade count', () => {
    const trades = [makeTrade(10), makeTrade(-5), makeTrade(20)]
    const result = computeMetrics(makeResult([10_000, 10_025], trades), 10_000)
    expect(result.numTrades).toBe(3)
  })
})
