import type { StrategyRegistryEntry, Bar, Signal, Position } from '../types.js'
import { sma } from './indicators.js'

function smaCrossoverFn(bars: Bar[], _position: Position | null, params: Record<string, number>): Signal {
  const fast = params.fastWindow ?? 10
  const slow = params.slowWindow ?? 50
  const closes = bars.map(b => b.close)

  const fastSma = sma(closes, fast)
  const slowSma = sma(closes, slow)
  if (fastSma === null || slowSma === null) return 'flat'

  return fastSma > slowSma ? 'long' : 'flat'
}

export const smaCrossover: StrategyRegistryEntry = {
  id: 'sma-crossover',
  name: 'SMA Crossover',
  description: 'Go long when the fast simple moving average crosses above the slow SMA; exit when it crosses below.',
  params: [
    { name: 'fastWindow', label: 'Fast Window', description: 'Period for the fast SMA', type: 'int', min: 2, max: 100, step: 1, default: 10 },
    { name: 'slowWindow', label: 'Slow Window', description: 'Period for the slow SMA', type: 'int', min: 10, max: 400, step: 1, default: 50 },
  ],
  fn: smaCrossoverFn,
}
