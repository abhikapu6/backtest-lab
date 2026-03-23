import { Card } from '../components/index.js'

export function History() {
  return (
    <div>
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
        Backtest History
      </h1>
      <Card>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Previous backtest runs will be listed here. Coming in Phase 9.
        </p>
      </Card>
    </div>
  )
}
