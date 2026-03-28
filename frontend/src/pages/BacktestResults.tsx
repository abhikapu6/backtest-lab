import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { Card, KpiCard, Table } from '../components/index.js'
import { fadeSlideUp, staggerContainer } from '../utils/animations.js'

const CHART_PRIMARY = '#2f9e44'
const CHART_DANGER = '#dc2626'

interface BacktestDetail {
  id: string
  createdAt: string
  strategy: string
  symbols: string[]
  startDate: string
  endDate: string
  params: Record<string, number>
  costModel: { enabled: boolean; commissionPerTrade: number; slippageBps: number }
  initialCapital: number
  status: string
  metrics: {
    totalReturn: number
    cagr: number
    sharpe: number
    volatility: number
    maxDrawdown: number
    winRate: number
    profitFactor: number
    numTrades: number
  } | null
}

interface EquityPoint {
  date: string
  equity: number
  drawdown: number
}

interface Trade {
  symbol: string
  entryDate: string
  exitDate: string
  entryPrice: number
  exitPrice: number
  pnl: number
  returnPct: number
}

const STRATEGY_NAMES: Record<string, string> = {
  'sma-crossover':      'SMA Crossover',
  'ema-crossover':      'EMA Crossover',
  'macd-crossover':     'MACD Crossover',
  'rsi-mean-reversion': 'RSI Mean Reversion',
  'bollinger-bands':    'Bollinger Bands',
  'donchian-channel':   'Donchian Channel',
}

function pct(v: number, decimals = 2) {
  const sign = v >= 0 ? '+' : ''
  return `${sign}${(v * 100).toFixed(decimals)}%`
}

function fmt(v: number, decimals = 2) {
  return v.toFixed(decimals)
}

function fmtDate(iso: string) {
  return iso.slice(0, 10)
}

function fmtMoney(v: number) {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

function fmtAxisDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtTooltipDate(iso: string) {
  return fmtDate(iso)
}

type LoadState = 'loading' | 'error' | 'not-found' | 'done'

export function BacktestResults() {
  const { id } = useParams<{ id: string }>()
  const [state, setState] = useState<LoadState>('loading')
  const [detail, setDetail] = useState<BacktestDetail | null>(null)
  const [equity, setEquity] = useState<EquityPoint[]>([])
  const [trades, setTrades] = useState<Trade[]>([])

  useEffect(() => {
    if (!id) return
    setState('loading')

    Promise.all([
      fetch(`/api/backtests/${id}`),
      fetch(`/api/backtests/${id}/equity`),
      fetch(`/api/backtests/${id}/trades`),
    ])
      .then(async ([dRes, eRes, tRes]) => {
        if (dRes.status === 404) { setState('not-found'); return }
        if (!dRes.ok || !eRes.ok || !tRes.ok) { setState('error'); return }

        const [d, e, t] = await Promise.all([dRes.json(), eRes.json(), tRes.json()])
        setDetail(d)
        setEquity(e.equity)
        setTrades(t.trades)
        setState('done')
      })
      .catch(() => setState('error'))
  }, [id])

  if (state === 'loading') return <LoadingSkeleton />
  if (state === 'not-found') return <NotFound id={id} />
  if (state === 'error' || !detail) return <ErrorState />

  const m = detail.metrics
  const strategyName = STRATEGY_NAMES[detail.strategy] ?? detail.strategy

  const tickInterval = Math.max(1, Math.floor(equity.length / 8))
  const equityTicks = equity.filter((_, i) => i % tickInterval === 0 || i === equity.length - 1)
    .map(p => p.date)

  return (
    <motion.div
      className="page-wide"
      variants={staggerContainer(0.07)}
      initial="hidden"
      animate="show"
    >
      <motion.header variants={fadeSlideUp} style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
          <h1 className="page-title page-title--sm" style={{ margin: 0 }}>{strategyName}</h1>
          <span className="status-badge">{detail.status}</span>
        </div>
        <div className="meta-row">
          <MetaItem label={detail.symbols.join(', ')}>
            <IconChartBar />
          </MetaItem>
          <MetaItem label={`${fmtDate(detail.startDate)} → ${fmtDate(detail.endDate)}`}>
            <IconCalendar />
          </MetaItem>
          <MetaItem label={`${fmtMoney(detail.initialCapital)} initial capital`}>
            <IconWallet />
          </MetaItem>
          {detail.costModel.enabled && (
            <MetaItem label={`$${detail.costModel.commissionPerTrade} commission · ${detail.costModel.slippageBps} bps slippage`}>
              <IconSliders />
            </MetaItem>
          )}
          <MetaItem label={`Run ${fmtDate(detail.createdAt)}`}>
            <IconClock />
          </MetaItem>
        </div>
      </motion.header>

      {m && (
        <motion.div variants={fadeSlideUp} className="kpi-grid">
          <KpiCard
            index={0}
            label="Total Return"
            value={pct(m.totalReturn)}
            rawValue={m.totalReturn}
            formatter={(n) => pct(n)}
            subValue={`vs ${fmtMoney(detail.initialCapital)} initial`}
            trend={m.totalReturn >= 0 ? 'up' : 'down'}
          />
          <KpiCard
            index={1}
            label="CAGR"
            value={pct(m.cagr)}
            rawValue={m.cagr}
            formatter={(n) => pct(n)}
            subValue="Annualised"
            trend={m.cagr >= 0 ? 'up' : 'down'}
          />
          <KpiCard
            index={2}
            label="Sharpe Ratio"
            value={fmt(m.sharpe)}
            rawValue={m.sharpe}
            formatter={(n) => fmt(n)}
            subValue="Risk-free rate = 0"
            trend={m.sharpe >= 1 ? 'up' : m.sharpe >= 0 ? 'neutral' : 'down'}
          />
          <KpiCard
            index={3}
            label="Volatility"
            value={pct(m.volatility)}
            rawValue={m.volatility}
            formatter={(n) => pct(n)}
            subValue="Annualised (252d)"
            trend="neutral"
          />
          <KpiCard
            index={4}
            label="Max Drawdown"
            value={pct(m.maxDrawdown)}
            rawValue={m.maxDrawdown}
            formatter={(n) => pct(n)}
            subValue="Peak-to-trough"
            trend="down"
          />
          <KpiCard
            index={5}
            label="Win Rate"
            value={pct(m.winRate, 1)}
            rawValue={m.winRate}
            formatter={(n) => pct(n, 1)}
            subValue={`${m.numTrades} trades`}
            trend={m.winRate >= 0.5 ? 'up' : 'down'}
          />
          <KpiCard
            index={6}
            label="Profit Factor"
            value={m.profitFactor >= 999 ? '∞' : fmt(m.profitFactor)}
            rawValue={m.profitFactor >= 999 ? undefined : m.profitFactor}
            formatter={m.profitFactor >= 999 ? undefined : (n) => fmt(n)}
            subValue="Gross win / gross loss"
            trend={m.profitFactor >= 1.5 ? 'up' : m.profitFactor >= 1 ? 'neutral' : 'down'}
          />
          <KpiCard
            index={7}
            label="Total Trades"
            value={String(m.numTrades)}
            rawValue={m.numTrades}
            formatter={(n) => String(Math.round(n))}
            subValue="Completed round-trips"
            trend="neutral"
          />
        </motion.div>
      )}

      {equity.length > 0 && (
        <>
          <motion.div variants={fadeSlideUp}>
            <Card className="chart-surface" padding="var(--space-5)">
              <h2 className="chart-title">Equity Curve</h2>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={equity} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    ticks={equityTicks}
                    tickFormatter={fmtAxisDate}
                    tick={{ fontSize: 11, fill: '#6b8a7a' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: '#6b8a7a' }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip content={<EquityTooltip initialCapital={detail.initialCapital} />} />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke={CHART_PRIMARY}
                    strokeWidth={2.5}
                    fill="url(#equityGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: CHART_PRIMARY, stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          <motion.div variants={fadeSlideUp}>
            <Card className="chart-surface" padding="var(--space-5)">
              <h2 className="chart-title">Drawdown</h2>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={equity} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_DANGER} stopOpacity={0.22} />
                      <stop offset="95%" stopColor={CHART_DANGER} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    ticks={equityTicks}
                    tickFormatter={fmtAxisDate}
                    tick={{ fontSize: 11, fill: '#6b8a7a' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                    tick={{ fontSize: 11, fill: '#6b8a7a' }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <ReferenceLine y={0} stroke="var(--color-border)" strokeWidth={1} />
                  <Tooltip content={<DrawdownTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="drawdown"
                    stroke={CHART_DANGER}
                    strokeWidth={1.5}
                    fill="url(#ddGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: CHART_DANGER, stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </>
      )}

      <motion.div variants={fadeSlideUp}>
        <Card padding="0">
          <div style={{ padding: 'var(--space-5) var(--space-5) var(--space-3)' }}>
            <h2 className="chart-title">Trades ({trades.length})</h2>
          </div>
          <Table
            columns={tradeColumns}
            data={trades}
            rowKey={(_, i) => String(i)}
            emptyMessage="No trades were executed"
          />
        </Card>
      </motion.div>
    </motion.div>
  )
}

const tradeColumns = [
  {
    key: 'symbol',
    header: 'Symbol',
    render: (t: Trade) => (
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-primary)' }}>
        {t.symbol}
      </span>
    ),
    width: '80px',
  },
  {
    key: 'entryDate',
    header: 'Entry Date',
    render: (t: Trade) => fmtDate(t.entryDate),
  },
  {
    key: 'exitDate',
    header: 'Exit Date',
    render: (t: Trade) => fmtDate(t.exitDate),
  },
  {
    key: 'entryPrice',
    header: 'Entry Price',
    align: 'right' as const,
    render: (t: Trade) => (
      <span style={{ fontFamily: 'var(--font-mono)' }}>{fmtMoney(t.entryPrice)}</span>
    ),
  },
  {
    key: 'exitPrice',
    header: 'Exit Price',
    align: 'right' as const,
    render: (t: Trade) => (
      <span style={{ fontFamily: 'var(--font-mono)' }}>{fmtMoney(t.exitPrice)}</span>
    ),
  },
  {
    key: 'pnl',
    header: 'PnL',
    align: 'right' as const,
    render: (t: Trade) => (
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          color: t.pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
        }}
      >
        {t.pnl >= 0 ? '+' : ''}
        {fmtMoney(t.pnl)}
      </span>
    ),
  },
  {
    key: 'returnPct',
    header: 'Return',
    align: 'right' as const,
    render: (t: Trade) => (
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          color: t.returnPct >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
        }}
      >
        {pct(t.returnPct)}
      </span>
    ),
  },
]

function EquityTooltip({
  active,
  payload,
  initialCapital,
}: {
  active?: boolean
  payload?: Array<{ payload: EquityPoint }>
  initialCapital: number
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const ret = initialCapital > 0 ? (p.equity - initialCapital) / initialCapital : 0
  return (
    <div className="chart-tooltip">
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        {fmtTooltipDate(p.date)}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtMoney(p.equity)}</div>
      <div style={{ fontSize: 'var(--text-xs)', color: ret >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
        {pct(ret)} total return
      </div>
    </div>
  )
}

function DrawdownTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: EquityPoint }> }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        {fmtTooltipDate(p.date)}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-danger)' }}>
        {pct(p.drawdown)}
      </div>
    </div>
  )
}

function MetaItem({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span className="meta-item">
      <span style={{ display: 'flex', color: 'var(--color-primary)' }}>{children}</span>
      {label}
    </span>
  )
}

function IconChartBar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M7 16l4-8 4 4 6-10" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconWallet() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  )
}

function IconSliders() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function LoadingSkeleton() {
  return (
    <div className="page-wide">
      <div className="skeleton" style={{ width: 260, height: 36, marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-md)' }} />
      <div className="skeleton" style={{ width: 400, height: 18, marginBottom: 'var(--space-6)', borderRadius: 'var(--radius-md)' }} />
      <div className="kpi-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-xl)' }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 290, borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-6)', marginTop: 'var(--space-6)' }} />
      <div className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-xl)' }} />
    </div>
  )
}

function NotFound({ id }: { id?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
          <path d="M11 8v4M11 16h.01" />
        </svg>
      </div>
      <h2 className="empty-state__title">Backtest not found</h2>
      <p className="empty-state__text">
        No backtest with ID <code>{id}</code> exists.
      </p>
      <Link to="/backtest/new" className="link-pill">
        Run a new backtest
      </Link>
    </div>
  )
}

function ErrorState() {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" style={{ color: 'var(--color-warning)' }} aria-hidden>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <h2 className="empty-state__title">Failed to load results</h2>
      <p className="empty-state__text" style={{ marginBottom: 0 }}>
        Check your connection or try again.
      </p>
    </div>
  )
}
