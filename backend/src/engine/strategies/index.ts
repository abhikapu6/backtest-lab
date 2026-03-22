import type { StrategyRegistryEntry } from '../types.js'
import { smaCrossover } from './sma-crossover.js'
import { rsiMeanReversion } from './rsi-mean-reversion.js'
import { bollingerBands } from './bollinger-bands.js'

const entries: StrategyRegistryEntry[] = [smaCrossover, rsiMeanReversion, bollingerBands]

const registry = new Map<string, StrategyRegistryEntry>(
  entries.map(s => [s.id, s]),
)

export function getStrategy(id: string): StrategyRegistryEntry | undefined {
  return registry.get(id)
}

export function getAllStrategies(): StrategyRegistryEntry[] {
  return [...registry.values()]
}
