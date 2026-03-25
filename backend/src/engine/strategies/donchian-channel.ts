import type { StrategyRegistryEntry, Bar, Signal, Position } from '../types.js'

function donchianChannelFn(bars: Bar[], position: Position | null, params: Record<string, number>): Signal {
  const breakoutWindow = Math.round(params.breakoutWindow ?? 20)
  const exitWindow     = Math.round(params.exitWindow     ?? 10)
  const lookback       = Math.max(breakoutWindow, exitWindow) + 1

  if (bars.length <= lookback) return 'flat'

  const current = bars[bars.length - 1]

  if (position) {
    // Exit when today's low drops below the lowest low of the past exitWindow bars
    const pastLows = bars.slice(-exitWindow - 1, -1).map(b => b.low)
    const lowestLow = Math.min(...pastLows)
    return current.low < lowestLow ? 'flat' : 'long'
  }

  // Enter when today's high breaks above the highest high of the past breakoutWindow bars
  const pastHighs = bars.slice(-breakoutWindow - 1, -1).map(b => b.high)
  const highestHigh = Math.max(...pastHighs)
  return current.high > highestHigh ? 'long' : 'flat'
}

export const donchianChannel: StrategyRegistryEntry = {
  id: 'donchian-channel',
  name: 'Donchian Channel',
  description: 'Trend-following breakout strategy. Go long when today\'s high breaks above the highest high of the past N bars (Turtle-style); exit when today\'s low drops below the lowest low of the past M bars.',
  params: [
    { name: 'breakoutWindow', label: 'Breakout Window', description: 'Bars to look back for the high-breakout entry signal', type: 'int', min: 5, max: 200, step: 1, default: 20 },
    { name: 'exitWindow',     label: 'Exit Window',     description: 'Bars to look back for the low-breakdown exit signal', type: 'int', min: 2, max: 100, step: 1, default: 10 },
  ],
  fn: donchianChannelFn,
}
