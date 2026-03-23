import { useParams } from 'react-router-dom'
import { Card } from '../components/index.js'

export function BacktestResults() {
  const { id } = useParams<{ id: string }>()

  return (
    <div>
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
        Backtest Results
      </h1>
      <Card>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Results for backtest <code>{id}</code>. Dashboard coming in Phase 8.
        </p>
      </Card>
    </div>
  )
}
