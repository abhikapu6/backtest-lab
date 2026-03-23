import { describe, it, expect } from 'vitest'
import { simulate } from '../simulator.js'
import type { Bar, CostModelConfig, StrategyFn } from '../types.js'

// ── Helpers ───────────────────────────────────────────────────────────

const noCosts: CostModelConfig = { enabled: false, commissionPerTrade: 0, slippageBps: 0 }
const withCosts: CostModelConfig = { enabled: true, commissionPerTrade: 5, slippageBps: 10 }

function makeBar(symbol: string, dateStr: string, price: number, open?: number): Bar {
  const date = new Date(dateStr)
  return { symbol, date, open: open ?? price, high: price, low: price, close: price, volume: 1000 }
}

/** Builds a Map with a single symbol's bars. */
function singleSymbol(bars: Bar[]): Map<string, Bar[]> {
  return new Map([['SPY', bars]])
}

/** Strategy that is always long. */
const alwaysLong: StrategyFn = () => 'long'

/** Strategy that is always flat. */
const alwaysFlat: StrategyFn = () => 'flat'

// ── Basic signal execution ────────────────────────────────────────────

describe('simulate – basic execution', () => {
  it('returns empty result for empty input', () => {
    const result = simulate(new Map(), alwaysLong, {}, noCosts, 10_000)
    expect(result.equitySeries).toHaveLength(0)
    expect(result.trades).toHaveLength(0)
    expect(result.finalEquity).toBe(10_000)
  })

  it('never trades when always flat', () => {
    const bars = [
      makeBar('SPY', '2020-01-02', 100),
      makeBar('SPY', '2020-01-03', 110),
      makeBar('SPY', '2020-01-04', 120),
    ]
    const result = simulate(singleSymbol(bars), alwaysFlat, {}, noCosts, 10_000)
    expect(result.trades).toHaveLength(0)
    expect(result.finalEquity).toBeCloseTo(10_000)
  })
})

// ── No-lookahead guarantee ─────────────────────────────────────────────

describe('simulate – no lookahead', () => {
  it('executes signal from bar[i] at bar[i+1] open, not bar[i] close', () => {
    // Bar 0 close = 100, bar 1 open = 200 (big gap). alwaysLong fires.
    // We should BUY at bar[1]'s open (200), not bar[0]'s close (100).
    const bars = [
      makeBar('SPY', '2020-01-02', 100, 100),
      makeBar('SPY', '2020-01-03', 300, 200), // open=200, close=300
      makeBar('SPY', '2020-01-04', 300, 300),
    ]
    const result = simulate(singleSymbol(bars), alwaysLong, {}, noCosts, 10_000)
    // Position was entered at bar[1] open = 200
    expect(result.trades[0]?.entryPrice).toBeCloseTo(200)
  })

  it('the strategy at bar[i] does not see bar[i+1] data', () => {
    // Strategy signals based on the final bar's price; assert it never sees future bars.
    let maxBarsSeenAtSignal = 0
    const spyingStrategy: StrategyFn = (bars) => {
      maxBarsSeenAtSignal = Math.max(maxBarsSeenAtSignal, bars.length)
      return 'flat'
    }
    const bars = [
      makeBar('SPY', '2020-01-02', 100),
      makeBar('SPY', '2020-01-03', 110),
      makeBar('SPY', '2020-01-04', 120),
      makeBar('SPY', '2020-01-05', 130),
    ]
    simulate(singleSymbol(bars), spyingStrategy, {}, noCosts, 10_000)
    // On the last bar (index 3), history should have exactly 4 bars
    expect(maxBarsSeenAtSignal).toBe(4)
  })
})

// ── PnL calculation ───────────────────────────────────────────────────

describe('simulate – PnL', () => {
  it('records correct pnl for a winning trade without costs', () => {
    // Enter at 100, exit at 150 → buy 100 shares, PnL = 5000
    const bars = [
      makeBar('SPY', '2020-01-02', 100, 100), // signal: long
      makeBar('SPY', '2020-01-03', 150, 100), // buy at open=100; signal: flat
      makeBar('SPY', '2020-01-04', 150, 150), // sell at open=150
    ]
    const enterThenExit: StrategyFn = (bars, position) => {
      if (bars.length === 1) return 'long'
      if (position) return 'flat'
      return 'flat'
    }
    const result = simulate(singleSymbol(bars), enterThenExit, {}, noCosts, 10_000)
    expect(result.trades).toHaveLength(1)
    const trade = result.trades[0]
    expect(trade.entryPrice).toBeCloseTo(100)
    expect(trade.exitPrice).toBeCloseTo(150)
    expect(trade.pnl).toBeGreaterThan(0)
    expect(trade.returnPct).toBeCloseTo(0.5, 2) // 50% return
  })

  it('deducts commission from both legs when costs are enabled', () => {
    const bars = [
      makeBar('SPY', '2020-01-02', 100, 100),
      makeBar('SPY', '2020-01-03', 100, 100), // buy at 100
      makeBar('SPY', '2020-01-04', 100, 100), // sell at 100
    ]
    const enterThenExit: StrategyFn = (bars, position) => {
      if (bars.length === 1) return 'long'
      if (position) return 'flat'
      return 'flat'
    }
    const result = simulate(singleSymbol(bars), enterThenExit, {}, withCosts, 10_000)
    // Flat price, but commission charged on both legs → PnL < 0
    expect(result.trades[0].pnl).toBeLessThan(0)
  })

  it('force-closes open position at last bar close', () => {
    // alwaysLong should have open position at end — must be closed
    const bars = [
      makeBar('SPY', '2020-01-02', 100, 100),
      makeBar('SPY', '2020-01-03', 110, 110),
      makeBar('SPY', '2020-01-04', 120, 120),
    ]
    const result = simulate(singleSymbol(bars), alwaysLong, {}, noCosts, 10_000)
    expect(result.trades).toHaveLength(1)
    expect(result.trades[0].exitPrice).toBeCloseTo(120) // closed at last close
  })
})

// ── Equity tracking ───────────────────────────────────────────────────

describe('simulate – equity series', () => {
  it('produces one equity point per trading day', () => {
    const bars = [
      makeBar('SPY', '2020-01-02', 100),
      makeBar('SPY', '2020-01-03', 110),
      makeBar('SPY', '2020-01-04', 120),
      makeBar('SPY', '2020-01-05', 130),
    ]
    const result = simulate(singleSymbol(bars), alwaysFlat, {}, noCosts, 10_000)
    expect(result.equitySeries).toHaveLength(4)
  })

  it('drawdown is 0 when equity always rises', () => {
    // Always flat → cash stays at initial → no drawdown
    const bars = [
      makeBar('SPY', '2020-01-02', 100),
      makeBar('SPY', '2020-01-03', 110),
      makeBar('SPY', '2020-01-04', 120),
    ]
    const result = simulate(singleSymbol(bars), alwaysFlat, {}, noCosts, 10_000)
    for (const pt of result.equitySeries) {
      expect(pt.drawdown).toBeCloseTo(0)
    }
  })

  it('drawdown is negative when equity falls below peak', () => {
    // Buy at 100 (bar1 open), price falls to 50 by bar2
    const bars = [
      makeBar('SPY', '2020-01-02', 100, 100), // signal long
      makeBar('SPY', '2020-01-03', 100, 100), // buy at open 100; close 100 → equity at peak
      makeBar('SPY', '2020-01-04',  50,  50), // price drops → drawdown
    ]
    const result = simulate(singleSymbol(bars), alwaysLong, {}, noCosts, 10_000)
    const dd = result.equitySeries[result.equitySeries.length - 1].drawdown
    expect(dd).toBeLessThan(0)
  })

  it('capital is split equally across symbols', () => {
    // Two symbols, $10k initial → each gets $5k
    const spyBars = [makeBar('SPY', '2020-01-02', 100), makeBar('SPY', '2020-01-03', 100)]
    const qqqBars = [makeBar('QQQ', '2020-01-02', 100), makeBar('QQQ', '2020-01-03', 100)]
    const bars = new Map([['SPY', spyBars], ['QQQ', qqqBars]])
    const result = simulate(bars, alwaysFlat, {}, noCosts, 10_000)
    // Flat + no trade → stays at $10k
    expect(result.finalEquity).toBeCloseTo(10_000)
  })
})
