import type { CostModelConfig } from './types.js'

export function buyExecutionPrice(costModel: CostModelConfig, rawPrice: number): number {
  if (!costModel.enabled) return rawPrice
  return rawPrice * (1 + costModel.slippageBps / 10_000)
}

export function sellExecutionPrice(costModel: CostModelConfig, rawPrice: number): number {
  if (!costModel.enabled) return rawPrice
  return rawPrice * (1 - costModel.slippageBps / 10_000)
}

export function tradeCommission(costModel: CostModelConfig): number {
  return costModel.enabled ? costModel.commissionPerTrade : 0
}
