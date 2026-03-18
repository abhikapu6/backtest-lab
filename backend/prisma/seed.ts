import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'
import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TSLA']
const START_DATE = '2015-01-01'
const END_DATE = '2025-12-31'

async function fetchAndSeed(symbol: string) {
  console.log(`Fetching ${symbol} from ${START_DATE} to ${END_DATE}...`)

  const result = await yahooFinance.historical(symbol, {
    period1: START_DATE,
    period2: END_DATE,
    interval: '1d',
  })

  if (!result.length) {
    console.warn(`  No data returned for ${symbol}`)
    return 0
  }

  const rows = result
    .filter((r) => r.open != null && r.high != null && r.low != null && r.close != null)
    .map((r) => ({
      symbol,
      date: r.date,
      open: r.open!,
      high: r.high!,
      low: r.low!,
      close: r.close!,
      volume: BigInt(r.volume ?? 0),
    }))

  const BATCH_SIZE = 100
  let inserted = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    await prisma.$transaction(
      batch.map((row) =>
        prisma.candle.upsert({
          where: { symbol_date: { symbol: row.symbol, date: row.date } },
          update: row,
          create: row,
        }),
      ),
    )
    inserted += batch.length
  }

  console.log(`  ${symbol}: ${inserted} candles loaded`)
  return inserted
}

async function validateData() {
  console.log('\nValidation:')
  for (const symbol of SYMBOLS) {
    const count = await prisma.candle.count({ where: { symbol } })
    const negatives = await prisma.candle.count({
      where: {
        symbol,
        OR: [{ open: { lt: 0 } }, { high: { lt: 0 } }, { low: { lt: 0 } }, { close: { lt: 0 } }],
      },
    })
    const range = await prisma.candle.aggregate({
      where: { symbol },
      _min: { date: true },
      _max: { date: true },
    })
    console.log(
      `  ${symbol}: ${count} rows, ` +
        `${range._min.date?.toISOString().slice(0, 10)} → ${range._max.date?.toISOString().slice(0, 10)}, ` +
        `negative prices: ${negatives}`,
    )
  }
}

async function main() {
  console.log('Seeding OHLCV data...\n')
  let total = 0
  for (const symbol of SYMBOLS) {
    total += await fetchAndSeed(symbol)
  }
  console.log(`\nTotal: ${total} candles`)
  await validateData()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
