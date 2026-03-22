import type { StrategyRegistryEntry, Bar, Signal, Position } from '../types.js'
import { rsi } from './indicators.js'

function rsiMeanReversionFn(bars: Bar[], position: Position | null, params: Record<string, number>): Signal {
  const lookback = params.lookback ?? 14
  const oversold = params.oversold ?? 30
  const overbought = params.overbought ?? 70
  const closes = bars.map(b => b.close)

  const value = rsi(closes, lookback)
  if (value === null) return 'flat'

  if (position) {
    // Exit when RSI climbs above overbought threshold
    return value > overbought ? 'flat' : 'long'
  }
  // Enter when RSI drops below oversold threshold
  return value < oversold ? 'long' : 'flat'
}

export const rsiMeanReversion: StrategyRegistryEntry = {
  id: 'rsi-mean-reversion',
  name: 'RSI Mean Reversion',
  description: 'Go long when RSI drops below the oversold threshold; exit when it rises above the overbought threshold.',
  params: [
    { name: 'lookback', label: 'Lookback', description: 'RSI calculation period', type: 'int', min: 2, max: 100, step: 1, default: 14 },
    { name: 'oversold', label: 'Oversold', description: 'RSI level to enter long', type: 'int', min: 5, max: 50, step: 1, default: 30 },
    { name: 'overbought', label: 'Overbought', description: 'RSI level to exit position', type: 'int', min: 50, max: 95, step: 1, default: 70 },
  ],
  fn: rsiMeanReversionFn,
}
