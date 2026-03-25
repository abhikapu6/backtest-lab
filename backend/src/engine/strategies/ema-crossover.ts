import type { StrategyRegistryEntry, Bar, Signal, Position } from '../types.js'
import { ema } from './indicators.js'

function emaCrossoverFn(bars: Bar[], _position: Position | null, params: Record<string, number>): Signal {
  const fast = params.fastWindow ?? 12
  const slow = params.slowWindow ?? 26
  const closes = bars.map(b => b.close)

  const fastEma = ema(closes, fast)
  const slowEma = ema(closes, slow)
  if (fastEma === null || slowEma === null) return 'flat'

  return fastEma > slowEma ? 'long' : 'flat'
}

export const emaCrossover: StrategyRegistryEntry = {
  id: 'ema-crossover',
  name: 'EMA Crossover',
  description: 'Go long when the fast exponential moving average crosses above the slow EMA; exit when it crosses below. EMAs react faster to recent price changes than SMAs.',
  params: [
    { name: 'fastWindow', label: 'Fast Window', description: 'Period for the fast EMA', type: 'int', min: 2, max: 100, step: 1, default: 12 },
    { name: 'slowWindow', label: 'Slow Window', description: 'Period for the slow EMA', type: 'int', min: 10, max: 400, step: 1, default: 26 },
  ],
  fn: emaCrossoverFn,
}
