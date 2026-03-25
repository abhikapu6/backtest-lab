/**
 * Exponential moving average over the full series, seeded with the first value.
 * Returns null when values.length < period.
 */
export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null
  const k = 2 / (period + 1)
  let result = values[0]
  for (let i = 1; i < values.length; i++) {
    result = values[i] * k + result * (1 - k)
  }
  return result
}

/**
 * MACD: returns the current MACD line and signal line values.
 * Returns null when there are insufficient bars to warm up both the slow EMA
 * and the signal EMA.
 */
export function macd(
  closes: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number,
): { macdLine: number; signalLine: number } | null {
  if (closes.length < slowPeriod + signalPeriod) return null

  const kFast = 2 / (fastPeriod + 1)
  const kSlow = 2 / (slowPeriod + 1)
  const kSig  = 2 / (signalPeriod + 1)

  let fastEma = closes[0]
  let slowEma = closes[0]
  const macdValues: number[] = []

  for (let i = 1; i < closes.length; i++) {
    fastEma = closes[i] * kFast + fastEma * (1 - kFast)
    slowEma = closes[i] * kSlow + slowEma * (1 - kSlow)
    if (i >= slowPeriod - 1) macdValues.push(fastEma - slowEma)
  }

  if (macdValues.length < signalPeriod) return null

  let signalEma = macdValues[0]
  for (let i = 1; i < macdValues.length; i++) {
    signalEma = macdValues[i] * kSig + signalEma * (1 - kSig)
  }

  return { macdLine: macdValues[macdValues.length - 1], signalLine: signalEma }
}

/** Simple moving average of the last `window` values. */
export function sma(values: number[], window: number): number | null {
  if (values.length < window) return null
  let sum = 0
  for (let i = values.length - window; i < values.length; i++) sum += values[i]
  return sum / window
}

/** Population standard deviation of the last `window` values around a given mean. */
export function stdDev(values: number[], window: number, mean: number): number | null {
  if (values.length < window) return null
  let sumSq = 0
  for (let i = values.length - window; i < values.length; i++) {
    const d = values[i] - mean
    sumSq += d * d
  }
  return Math.sqrt(sumSq / window)
}

/** Wilder's RSI, replaying the full series for a stable smoothed value. */
export function rsi(closes: number[], lookback: number): number | null {
  if (closes.length < lookback + 1) return null

  let avgGain = 0
  let avgLoss = 0

  // Seed with simple average over the first lookback changes
  for (let i = 1; i <= lookback; i++) {
    const change = closes[i] - closes[i - 1]
    if (change > 0) avgGain += change
    else avgLoss -= change
  }
  avgGain /= lookback
  avgLoss /= lookback

  // Wilder's exponential smoothing for remaining bars
  for (let i = lookback + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0
    avgGain = (avgGain * (lookback - 1) + gain) / lookback
    avgLoss = (avgLoss * (lookback - 1) + loss) / lookback
  }

  if (avgLoss === 0) return 100
  return 100 - 100 / (1 + avgGain / avgLoss)
}
