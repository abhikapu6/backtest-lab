import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card } from '../components/index.js'
import type { CloneState } from './NewBacktest.js'

// ── API types ────────────────────────────────────────────────────────

interface BacktestSummary {
  id: string
  createdAt: string
  strategy: string
  symbols: string[]
  startDate: string
  endDate: string
  initialCapital: number
  status: string
  params: Record<string, number>
  costModel: { enabled: boolean; commissionPerTrade: number; slippageBps: number; stopLossPercent?: number }
  metrics: {
    totalReturn: number
    cagr: number
    sharpe: number
    maxDrawdown: number
    numTrades: number
  } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ── Helpers ──────────────────────────────────────────────────────────

const STRATEGY_NAMES: Record<string, string> = {
  'sma-crossover':      'SMA Crossover',
  'ema-crossover':      'EMA Crossover',
  'macd-crossover':     'MACD Crossover',
  'rsi-mean-reversion': 'RSI Mean Reversion',
  'bollinger-bands':    'Bollinger Bands',
  'donchian-channel':   'Donchian Channel',
}

function pct(v: number) {
  const sign = v >= 0 ? '+' : ''
  return `${sign}${(v * 100).toFixed(2)}%`
}

function fmtDate(iso: string) {
  return iso.slice(0, 10)
}

// ── Component ────────────────────────────────────────────────────────

export function History() {
  const navigate = useNavigate()
  const [backtests, setBacktests] = useState<BacktestSummary[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    fetch(`/api/backtests?page=${page}&limit=20`)
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        setBacktests(data.backtests)
        setPagination(data.pagination)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [page])

  function cloneConfig(bt: BacktestSummary) {
    const state: CloneState = {
      symbols: bt.symbols,
      startDate: fmtDate(bt.startDate),
      endDate: fmtDate(bt.endDate),
      strategyId: bt.strategy,
      params: bt.params ?? {},
      costEnabled: bt.costModel?.enabled ?? false,
      commission: String(bt.costModel?.commissionPerTrade ?? 1),
      slippage: String(bt.costModel?.slippageBps ?? 5),
      stopLossEnabled: (bt.costModel?.stopLossPercent ?? 0) > 0,
      stopLoss: String(bt.costModel?.stopLossPercent ?? 5),
      initialCapital: String(bt.initialCapital),
    }
    navigate('/backtest/new', { state })
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Backtest History</h1>
        <Button variant="primary" size="sm" onClick={() => navigate('/backtest/new')}>
          + New Backtest
        </Button>
      </div>

      {error && (
        <Card>
          <p style={{ color: 'var(--color-danger)', textAlign: 'center', padding: 'var(--space-6)' }}>
            Failed to load history. Check your connection.
          </p>
        </Card>
      )}

      {!error && (
        <Card padding="0">
          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)' }}>
              <thead>
                <tr>
                  {['Run Date', 'Strategy', 'Symbols', 'Date Range', 'Total Return', 'Sharpe', 'Max DD', 'Trades', ''].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <td key={j} style={tdStyle}>
                          <div style={{
                            height: 14,
                            borderRadius: 4,
                            background: 'var(--color-bg-surface)',
                            animation: 'pulse 1.5s ease-in-out infinite',
                            width: j === 8 ? 80 : '80%',
                          }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : backtests.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-dim)', padding: 'var(--space-12)' }}>
                      No backtests yet.{' '}
                      <Link to="/backtest/new" style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
                        Run your first one →
                      </Link>
                    </td>
                  </tr>
                ) : (
                  backtests.map((bt) => {
                    const m = bt.metrics
                    return (
                      <tr
                        key={bt.id}
                        style={{ transition: 'background var(--transition-fast)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={tdStyle}>
                          <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                            {fmtDate(bt.createdAt)}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 500 }}>
                            {STRATEGY_NAMES[bt.strategy] ?? bt.strategy}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {bt.symbols.map((s) => (
                              <span key={s} style={chipStyle}>{s}</span>
                            ))}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                            {fmtDate(bt.startDate)} → {fmtDate(bt.endDate)}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {m ? (
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 600,
                              color: m.totalReturn >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                            }}>
                              {pct(m.totalReturn)}
                            </span>
                          ) : <Dash />}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {m ? (
                            <span style={{ fontFamily: 'var(--font-mono)' }}>
                              {m.sharpe.toFixed(2)}
                            </span>
                          ) : <Dash />}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {m ? (
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-danger)' }}>
                              {pct(m.maxDrawdown)}
                            </span>
                          ) : <Dash />}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {m ? (
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                              {m.numTrades}
                            </span>
                          ) : <Dash />}
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                            <Link
                              to={`/backtest/${bt.id}`}
                              style={{
                                padding: '4px 12px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--color-primary-ghost)',
                                color: 'var(--color-primary)',
                                fontSize: 'var(--text-sm)',
                                fontWeight: 500,
                                textDecoration: 'none',
                                border: '1px solid var(--color-primary)',
                              }}
                            >
                              View
                            </Link>
                            <button
                              onClick={() => cloneConfig(bt)}
                              title="Clone this config"
                              style={{
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'transparent',
                                color: 'var(--color-text-muted)',
                                fontSize: 'var(--text-sm)',
                                fontWeight: 500,
                                border: '1px solid var(--color-border)',
                                cursor: 'pointer',
                              }}
                            >
                              Clone
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div style={paginationStyle}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                {pagination.total} runs · page {pagination.page} of {pagination.totalPages}
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </Button>
              </div>
            </div>
          )}

          {/* Row count summary when single page */}
          {pagination && pagination.totalPages <= 1 && backtests.length > 0 && (
            <div style={{ ...paginationStyle, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-dim)' }}>
                {pagination.total} {pagination.total === 1 ? 'run' : 'runs'}
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

// ── Styles & tiny helpers ────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  textAlign: 'left',
  background: 'var(--color-bg-surface)',
  borderBottom: '1px solid var(--color-border)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 'var(--text-sm)',
  borderBottom: '1px solid var(--color-border)',
  whiteSpace: 'nowrap',
  color: 'var(--color-text)',
}

const chipStyle: React.CSSProperties = {
  padding: '1px 6px',
  borderRadius: 4,
  background: 'var(--color-primary-ghost)',
  color: 'var(--color-primary)',
  fontSize: 'var(--text-xs)',
  fontFamily: 'var(--font-mono)',
  fontWeight: 600,
  border: '1px solid var(--color-border)',
}

const paginationStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'var(--space-4) var(--space-5)',
  borderTop: '1px solid var(--color-border)',
}

function Dash() {
  return <span style={{ color: 'var(--color-text-dim)' }}>—</span>
}
