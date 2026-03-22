import type { StrategyRegistryEntry, Bar, Signal, Position } from '../types.js'
import { sma, stdDev } from './indicators.js'

function bollingerBandsFn(bars: Bar[], position: Position | null, params: Record<string, number>): Signal {
  const window = params.window ?? 20
  const numStdDevs = params.numStdDevs ?? 2
  const closes = bars.map(b => b.close)

  const middle = sma(closes, window)
  if (middle === null) return 'flat'
  const sd = stdDev(closes, window, middle)
  if (sd === null) return 'flat'

  const lower = middle - numStdDevs * sd
  const price = closes[closes.length - 1]

  if (position) {
    // Exit when price reverts above the middle band
    return price > middle ? 'flat' : 'long'
  }
  // Enter when price falls below the lower band
  return price < lower ? 'long' : 'flat'
}

export const bollingerBands: StrategyRegistryEntry = {
  id: 'bollinger-bands',
  name: 'Bollinger Bands',
  description: 'Go long when price drops below the lower Bollinger Band; exit when it reverts above the middle band.',
  params: [
    { name: 'window', label: 'Window', description: 'Lookback period for the moving average and standard deviation', type: 'int', min: 5, max: 100, step: 1, default: 20 },
    { name: 'numStdDevs', label: 'Std Devs', description: 'Number of standard deviations for the bands', type: 'float', min: 0.5, max: 4, step: 0.25, default: 2 },
  ],
  fn: bollingerBandsFn,
}
