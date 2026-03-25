import type { StrategyRegistryEntry, Bar, Signal, Position } from '../types.js'
import { macd } from './indicators.js'

function macdCrossoverFn(bars: Bar[], _position: Position | null, params: Record<string, number>): Signal {
  const fastPeriod   = params.fastPeriod   ?? 12
  const slowPeriod   = params.slowPeriod   ?? 26
  const signalPeriod = params.signalPeriod ?? 9
  const closes = bars.map(b => b.close)

  const result = macd(closes, fastPeriod, slowPeriod, signalPeriod)
  if (!result) return 'flat'

  return result.macdLine > result.signalLine ? 'long' : 'flat'
}

export const macdCrossover: StrategyRegistryEntry = {
  id: 'macd-crossover',
  name: 'MACD Crossover',
  description: 'Go long when the MACD line (fast EMA − slow EMA) crosses above the signal line (EMA of MACD); exit when it crosses below. Classic momentum strategy.',
  params: [
    { name: 'fastPeriod',   label: 'Fast Period',   description: 'Period for the fast EMA',       type: 'int', min: 2,  max: 100, step: 1, default: 12 },
    { name: 'slowPeriod',   label: 'Slow Period',   description: 'Period for the slow EMA',       type: 'int', min: 5,  max: 200, step: 1, default: 26 },
    { name: 'signalPeriod', label: 'Signal Period', description: 'EMA period for the signal line', type: 'int', min: 2,  max: 50,  step: 1, default: 9  },
  ],
  fn: macdCrossoverFn,
}
