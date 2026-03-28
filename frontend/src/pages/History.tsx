import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Card } from '../components/index.js'
import type { CloneState } from './NewBacktest.js'

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
    <div className="page-wide">
      <header className="page-header">
        <h1 className="page-title page-title--sm">Backtest History</h1>
        <Button variant="primary" size="sm" onClick={() => navigate('/backtest/new')}>
          New Backtest
        </Button>
      </header>

      {error && (
        <Card>
          <p style={{ color: 'var(--color-danger)', textAlign: 'center', padding: 'var(--space-6)' }}>
            Failed to load history. Check your connection.
          </p>
        </Card>
      )}

      {!error && (
        <Card padding="0">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {['Run Date', 'Strategy', 'Symbols', 'Date Range', 'Total Return', 'Sharpe', 'Max DD', 'Trades', ''].map((h, col) => (
                    <th key={`col-${col}`} className="data-table__th" style={col >= 4 ? { textAlign: 'right' } : undefined}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <td key={j} className="data-table__td">
                          <div
                            className="skeleton"
                            style={{
                              height: 14,
                              borderRadius: 6,
                              width: j === 8 ? 80 : ['55%', '70%', '60%', '80%', '45%', '40%', '45%', '40%', 80][j] ?? '80%',
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : backtests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="data-table__empty">
                      No backtests yet.{' '}
                      <Link to="/backtest/new" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                        Run your first one
                      </Link>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="wait">
                  {backtests.map((bt, index) => {
                    const m = bt.metrics
                    return (
                      <motion.tr
                        key={bt.id}
                        className="data-table__row"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ delay: index * 0.035, duration: 0.2, ease: [0.33, 1, 0.68, 1] }}
                      >
                        <td className="data-table__td">
                          <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                            {fmtDate(bt.createdAt)}
                          </span>
                        </td>
                        <td className="data-table__td">
                          <span style={{ fontWeight: 600 }}>{STRATEGY_NAMES[bt.strategy] ?? bt.strategy}</span>
                        </td>
                        <td className="data-table__td">
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {bt.symbols.map((s) => (
                              <span key={s} className="chip chip--tag chip--active">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="data-table__td">
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                            {fmtDate(bt.startDate)} → {fmtDate(bt.endDate)}
                          </span>
                        </td>
                        <td className="data-table__td" style={{ textAlign: 'right' }}>
                          {m ? (
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 600,
                                color: m.totalReturn >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                              }}
                            >
                              {pct(m.totalReturn)}
                            </span>
                          ) : (
                            <Dash />
                          )}
                        </td>
                        <td className="data-table__td" style={{ textAlign: 'right' }}>
                          {m ? <span style={{ fontFamily: 'var(--font-mono)' }}>{m.sharpe.toFixed(2)}</span> : <Dash />}
                        </td>
                        <td className="data-table__td" style={{ textAlign: 'right' }}>
                          {m ? (
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-danger)' }}>{pct(m.maxDrawdown)}</span>
                          ) : (
                            <Dash />
                          )}
                        </td>
                        <td className="data-table__td" style={{ textAlign: 'right' }}>
                          {m ? (
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{m.numTrades}</span>
                          ) : (
                            <Dash />
                          )}
                        </td>
                        <td className="data-table__td" style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                            <Link to={`/backtest/${bt.id}`} className="link-pill">
                              View
                            </Link>
                            <button type="button" onClick={() => cloneConfig(bt)} title="Clone this config" className="btn-ghost-inline">
                              Clone
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="pagination-bar">
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                {pagination.total} runs · page {pagination.page} of {pagination.totalPages}
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button variant="secondary" size="sm" disabled={pagination.page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Prev
                </Button>
                <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {pagination && pagination.totalPages <= 1 && backtests.length > 0 && (
            <div className="pagination-bar" style={{ justifyContent: 'flex-end' }}>
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

function Dash() {
  return <span style={{ color: 'var(--color-text-dim)' }}>—</span>
}
