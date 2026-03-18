import { prisma } from './client.js'

export const ALLOWED_SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TSLA'] as const
export type AllowedSymbol = (typeof ALLOWED_SYMBOLS)[number]

export function isAllowedSymbol(symbol: string): symbol is AllowedSymbol {
  return (ALLOWED_SYMBOLS as readonly string[]).includes(symbol)
}

export async function getAvailableDateRange(symbol: string) {
  const range = await prisma.candle.aggregate({
    where: { symbol },
    _min: { date: true },
    _max: { date: true },
  })
  return { minDate: range._min.date, maxDate: range._max.date }
}

export async function validateDateRange(
  symbols: string[],
  startDate: Date,
  endDate: Date,
): Promise<{ valid: boolean; error?: string }> {
  if (startDate >= endDate) {
    return { valid: false, error: 'Start date must be before end date' }
  }

  for (const symbol of symbols) {
    if (!isAllowedSymbol(symbol)) {
      return { valid: false, error: `Symbol ${symbol} is not in the allowed universe` }
    }
    const range = await getAvailableDateRange(symbol)
    if (!range.minDate || !range.maxDate) {
      return { valid: false, error: `No data available for ${symbol}` }
    }
    if (startDate < range.minDate) {
      return {
        valid: false,
        error: `Start date is before available data for ${symbol} (earliest: ${range.minDate.toISOString().slice(0, 10)})`,
      }
    }
    if (endDate > range.maxDate) {
      return {
        valid: false,
        error: `End date is after available data for ${symbol} (latest: ${range.maxDate.toISOString().slice(0, 10)})`,
      }
    }
  }

  return { valid: true }
}

export async function getCandleCount(symbol: string): Promise<number> {
  return prisma.candle.count({ where: { symbol } })
}

export async function getDataSummary() {
  const summary: Record<string, { count: number; minDate: string; maxDate: string }> = {}
  for (const symbol of ALLOWED_SYMBOLS) {
    const count = await getCandleCount(symbol)
    const range = await getAvailableDateRange(symbol)
    summary[symbol] = {
      count,
      minDate: range.minDate?.toISOString().slice(0, 10) ?? 'N/A',
      maxDate: range.maxDate?.toISOString().slice(0, 10) ?? 'N/A',
    }
  }
  return summary
}
