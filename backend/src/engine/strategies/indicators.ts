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
