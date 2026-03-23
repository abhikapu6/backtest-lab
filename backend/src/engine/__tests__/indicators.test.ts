import { describe, it, expect } from 'vitest'
import { sma, stdDev, rsi } from '../strategies/indicators.js'

// ── sma ──────────────────────────────────────────────────────────────

describe('sma', () => {
  it('returns null when values are fewer than window', () => {
    expect(sma([1, 2, 3], 5)).toBeNull()
    expect(sma([], 1)).toBeNull()
  })

  it('returns null when values exactly equal window minus one', () => {
    expect(sma([10, 20], 3)).toBeNull()
  })

  it('returns the mean of the last window values', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toBeCloseTo(4) // avg of [3,4,5]
    expect(sma([10, 20, 30], 3)).toBeCloseTo(20)
  })

  it('uses only the last window values when series is longer', () => {
    // [100, 200, 300, 400, 500] — window=2 → avg of last 2 = 450
    expect(sma([100, 200, 300, 400, 500], 2)).toBeCloseTo(450)
  })

  it('returns the single value when window equals 1', () => {
    expect(sma([42], 1)).toBeCloseTo(42)
  })
})

// ── stdDev ───────────────────────────────────────────────────────────

describe('stdDev', () => {
  it('returns null when values are fewer than window', () => {
    expect(stdDev([1, 2], 5, 1.5)).toBeNull()
  })

  it('returns 0 for a constant series', () => {
    expect(stdDev([5, 5, 5], 3, 5)).toBeCloseTo(0)
  })

  it('calculates population std dev correctly', () => {
    // values = [2, 4, 6], mean = 4 → variance = ((2-4)²+(4-4)²+(6-4)²)/3 = 8/3, std = sqrt(8/3)
    const expected = Math.sqrt(8 / 3)
    expect(stdDev([2, 4, 6], 3, 4)).toBeCloseTo(expected, 6)
  })

  it('uses only the last window values', () => {
    // prefix [100, 200] should be ignored; window=3 picks last 3 = [10, 20, 30], mean=20
    const expected = Math.sqrt(((10-20)**2 + (20-20)**2 + (30-20)**2) / 3)
    expect(stdDev([100, 200, 10, 20, 30], 3, 20)).toBeCloseTo(expected, 6)
  })
})

// ── rsi ──────────────────────────────────────────────────────────────

describe('rsi', () => {
  it('returns null when series has fewer than lookback+1 values', () => {
    expect(rsi([1, 2, 3], 5)).toBeNull()
    expect(rsi([1, 2, 3, 4], 4)).toBeNull()
  })

  it('returns exactly null at lookback values (needs lookback+1)', () => {
    expect(rsi(new Array(14).fill(1), 14)).toBeNull()
  })

  it('returns 100 when all changes are upward and no losses', () => {
    const allUp = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    expect(rsi(allUp, 14)).toBe(100)
  })

  it('returns a value between 0 and 100', () => {
    const mixed = [44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.15, 43.61, 44.33, 44.83, 45.10, 45.15, 46.0]
    const value = rsi(mixed, 14)
    expect(value).not.toBeNull()
    expect(value!).toBeGreaterThan(0)
    expect(value!).toBeLessThan(100)
  })

  it('is lower for a mostly declining series than a mostly rising one', () => {
    const rising  = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
    const falling = [24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10]
    expect(rsi(rising, 14)!).toBeGreaterThan(rsi(falling, 14)!)
  })
})
