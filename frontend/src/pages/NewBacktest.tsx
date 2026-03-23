import { Card } from '../components/index.js'

export function NewBacktest() {
  return (
    <div>
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
        Run Backtest
      </h1>
      <Card>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Configure and launch a new backtest. Form coming in Phase 7.
        </p>
      </Card>
    </div>
  )
}
