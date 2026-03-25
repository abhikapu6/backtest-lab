import { prisma } from '../db/client.js'
import { runBacktest, getStrategy } from '../engine/index.js'
import type { BacktestConfig } from '../engine/types.js'
import { computeMetrics } from './metrics.js'

/**
 * Full pipeline: validate strategy → run engine → compute metrics → persist.
 * Returns the new backtest ID.
 */
export async function executeAndPersist(config: BacktestConfig): Promise<string> {
  const entry = getStrategy(config.strategy.id)
  if (!entry) throw new Error(`Unknown strategy: ${config.strategy.id}`)

  const result = await runBacktest(config, entry.fn)
  const metrics = computeMetrics(result, config.initialCapital)

  const backtestId = await prisma.$transaction(async (tx) => {
    const bt = await tx.backtest.create({
      data: {
        strategy: config.strategy.id,
        symbols: config.symbols,
        startDate: config.startDate,
        endDate: config.endDate,
        params: config.strategy.params,
        costModel: {
          enabled: config.costModel.enabled,
          commissionPerTrade: config.costModel.commissionPerTrade,
          slippageBps: config.costModel.slippageBps,
          stopLossPercent: config.costModel.stopLossPercent ?? 0,
        },
        initialCapital: config.initialCapital,
        status: 'completed',
      },
    })

    await tx.backtestMetrics.create({
      data: {
        backtestId: bt.id,
        totalReturn: metrics.totalReturn,
        cagr: metrics.cagr,
        sharpe: metrics.sharpe,
        volatility: metrics.volatility,
        maxDrawdown: metrics.maxDrawdown,
        winRate: metrics.winRate,
        profitFactor: metrics.profitFactor,
        numTrades: metrics.numTrades,
      },
    })

    if (result.equitySeries.length > 0) {
      await tx.backtestEquity.createMany({
        data: result.equitySeries.map((e) => ({
          backtestId: bt.id,
          date: e.date,
          equity: e.equity,
          drawdown: e.drawdown,
        })),
      })
    }

    if (result.trades.length > 0) {
      await tx.backtestTrade.createMany({
        data: result.trades.map((t) => ({
          backtestId: bt.id,
          symbol: t.symbol,
          entryDate: t.entryDate,
          exitDate: t.exitDate,
          entryPrice: t.entryPrice,
          exitPrice: t.exitPrice,
          pnl: t.pnl,
          returnPct: t.returnPct,
        })),
      })
    }

    return bt.id
  })

  return backtestId
}
