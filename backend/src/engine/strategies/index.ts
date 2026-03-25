import type { StrategyRegistryEntry } from '../types.js'
import { smaCrossover } from './sma-crossover.js'
import { rsiMeanReversion } from './rsi-mean-reversion.js'
import { bollingerBands } from './bollinger-bands.js'
import { emaCrossover } from './ema-crossover.js'
import { macdCrossover } from './macd-crossover.js'
import { donchianChannel } from './donchian-channel.js'

const entries: StrategyRegistryEntry[] = [
  smaCrossover,
  emaCrossover,
  macdCrossover,
  rsiMeanReversion,
  bollingerBands,
  donchianChannel,
]

const registry = new Map<string, StrategyRegistryEntry>(
  entries.map(s => [s.id, s]),
)

export function getStrategy(id: string): StrategyRegistryEntry | undefined {
  return registry.get(id)
}

export function getAllStrategies(): StrategyRegistryEntry[] {
  return [...registry.values()]
}
