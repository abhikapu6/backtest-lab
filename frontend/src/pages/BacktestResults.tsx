import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
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

// ── API types ────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────

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

// ── Main component ───────────────────────────────────────────────────

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

  // Tick thinning for x-axis
  const tickInterval = Math.max(1, Math.floor(equity.length / 8))
  const equityTicks = equity.filter((_, i) => i % tickInterval === 0 || i === equity.length - 1)
    .map(p => p.date)

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, margin: 0 }}>
            {strategyName}
          </h1>
          <span style={statusBadgeStyle}>{detail.status}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          <MetaItem icon="📊" label={detail.symbols.join(', ')} />
          <MetaItem icon="📅" label={`${fmtDate(detail.startDate)} → ${fmtDate(detail.endDate)}`} />
          <MetaItem icon="💰" label={`${fmtMoney(detail.initialCapital)} initial capital`} />
          {detail.costModel.enabled && (
            <MetaItem icon="⚙️" label={`$${detail.costModel.commissionPerTrade} commission · ${detail.costModel.slippageBps} bps slippage`} />
          )}
          <MetaItem icon="🕐" label={`Run ${fmtDate(detail.createdAt)}`} />
        </div>
      </div>

      {/* ── KPI grid ─────────────────────────────────────────── */}
      {m && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <KpiCard
            label="Total Return"
            value={pct(m.totalReturn)}
            subValue={`vs $${fmtMoney(detail.initialCapital)} initial`}
            trend={m.totalReturn >= 0 ? 'up' : 'down'}
          />
          <KpiCard
            label="CAGR"
            value={pct(m.cagr)}
            subValue="Annualised"
            trend={m.cagr >= 0 ? 'up' : 'down'}
          />
          <KpiCard
            label="Sharpe Ratio"
            value={fmt(m.sharpe)}
            subValue="Risk-free rate = 0"
            trend={m.sharpe >= 1 ? 'up' : m.sharpe >= 0 ? 'neutral' : 'down'}
          />
          <KpiCard
            label="Volatility"
            value={pct(m.volatility)}
            subValue="Annualised (252d)"
            trend="neutral"
          />
          <KpiCard
            label="Max Drawdown"
            value={pct(m.maxDrawdown)}
            subValue="Peak-to-trough"
            trend="down"
          />
          <KpiCard
            label="Win Rate"
            value={pct(m.winRate, 1)}
            subValue={`${m.numTrades} trades`}
            trend={m.winRate >= 0.5 ? 'up' : 'down'}
          />
          <KpiCard
            label="Profit Factor"
            value={m.profitFactor >= 999 ? '∞' : fmt(m.profitFactor)}
            subValue="Gross win / gross loss"
            trend={m.profitFactor >= 1.5 ? 'up' : m.profitFactor >= 1 ? 'neutral' : 'down'}
          />
          <KpiCard
            label="Total Trades"
            value={String(m.numTrades)}
            subValue="Completed round-trips"
            trend="neutral"
          />
        </div>
      )}

      {/* ── Charts ───────────────────────────────────────────── */}
      {equity.length > 0 && (
        <>
          <Card style={{ marginBottom: 'var(--space-6)' }} padding="var(--space-5)">
            <ChartTitle>Equity Curve</ChartTitle>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={equity} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2f9e44" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2f9e44" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  ticks={equityTicks}
                  tickFormatter={fmtAxisDate}
                  tick={{ fontSize: 11, fill: 'var(--color-text-dim)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: 'var(--color-text-dim)' }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip
                  content={<EquityTooltip initialCapital={detail.initialCapital} />}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#2f9e44"
                  strokeWidth={2}
                  fill="url(#equityGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#2f9e44' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card style={{ marginBottom: 'var(--space-6)' }} padding="var(--space-5)">
            <ChartTitle>Drawdown</ChartTitle>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={equity} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  ticks={equityTicks}
                  tickFormatter={fmtAxisDate}
                  tick={{ fontSize: 11, fill: 'var(--color-text-dim)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  tick={{ fontSize: 11, fill: 'var(--color-text-dim)' }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <ReferenceLine y={0} stroke="var(--color-border)" strokeWidth={1} />
                <Tooltip
                  content={<DrawdownTooltip />}
                />
                <Area
                  type="monotone"
                  dataKey="drawdown"
                  stroke="#dc2626"
                  strokeWidth={1.5}
                  fill="url(#ddGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: '#dc2626' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {/* ── Trades table ─────────────────────────────────────── */}
      <Card padding="0">
        <div style={{ padding: 'var(--space-5) var(--space-5) var(--space-3)' }}>
          <ChartTitle>Trades ({trades.length})</ChartTitle>
        </div>
        <Table
          columns={tradeColumns}
          data={trades}
          rowKey={(_, i) => String(i)}
          emptyMessage="No trades were executed"
        />
      </Card>

    </div>
  )
}

// ── Trade columns ────────────────────────────────────────────────────

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
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        color: t.pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
      }}>
        {t.pnl >= 0 ? '+' : ''}{fmtMoney(t.pnl)}
      </span>
    ),
  },
  {
    key: 'returnPct',
    header: 'Return',
    align: 'right' as const,
    render: (t: Trade) => (
      <span style={{
        fontFamily: 'var(--font-mono)',
        color: t.returnPct >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
      }}>
        {pct(t.returnPct)}
      </span>
    ),
  },
]

// ── Custom tooltips ──────────────────────────────────────────────────

function EquityTooltip({ active, payload, initialCapital }: {
  active?: boolean
  payload?: Array<{ payload: EquityPoint }>
  initialCapital: number
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const ret = initialCapital > 0 ? (p.equity - initialCapital) / initialCapital : 0
  return (
    <div style={tooltipStyle}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        {fmtTooltipDate(p.date)}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
        {fmtMoney(p.equity)}
      </div>
      <div style={{ fontSize: 'var(--text-xs)', color: ret >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
        {pct(ret)} total return
      </div>
    </div>
  )
}

function DrawdownTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ payload: EquityPoint }>
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div style={tooltipStyle}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
        {fmtTooltipDate(p.date)}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-danger)' }}>
        {pct(p.drawdown)}
      </div>
    </div>
  )
}

// ── Small UI helpers ─────────────────────────────────────────────────

function MetaItem({ icon, label }: { icon: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span>{icon}</span>
      {label}
    </span>
  )
}

function ChartTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 'var(--text-base)',
      fontWeight: 600,
      color: 'var(--color-text)',
      margin: '0 0 var(--space-4)',
    }}>
      {children}
    </h2>
  )
}

// ── States ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ ...skeletonBase, width: 240, height: 32, marginBottom: 'var(--space-3)' }} />
      <div style={{ ...skeletonBase, width: 420, height: 18, marginBottom: 'var(--space-6)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ ...skeletonBase, height: 88, borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
      <div style={{ ...skeletonBase, height: 290, borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-6)' }} />
      <div style={{ ...skeletonBase, height: 180, borderRadius: 'var(--radius-lg)' }} />
    </div>
  )
}

function NotFound({ id }: { id?: string }) {
  return (
    <div style={centeredState}>
      <span style={{ fontSize: 40 }}>🔍</span>
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, margin: 'var(--space-3) 0 var(--space-2)' }}>
        Backtest not found
      </h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)' }}>
        No backtest with ID <code>{id}</code> exists.
      </p>
      <Link to="/backtest/new" style={{
        padding: '8px 18px',
        background: 'var(--color-primary)',
        color: '#fff',
        borderRadius: 'var(--radius-md)',
        fontWeight: 500,
        fontSize: 'var(--text-sm)',
      }}>
        Run a new backtest
      </Link>
    </div>
  )
}

function ErrorState() {
  return (
    <div style={centeredState}>
      <span style={{ fontSize: 40 }}>⚠️</span>
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, margin: 'var(--space-3) 0 var(--space-2)' }}>
        Failed to load results
      </h2>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Check your connection or try again.
      </p>
    </div>
  )
}

// ── Style constants ──────────────────────────────────────────────────

const tooltipStyle: React.CSSProperties = {
  background: 'var(--color-bg-raised)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: '8px 12px',
  fontSize: 'var(--text-sm)',
  boxShadow: 'var(--shadow-md)',
  color: 'var(--color-text)',
  minWidth: 120,
}

const statusBadgeStyle: React.CSSProperties = {
  padding: '2px 10px',
  borderRadius: 999,
  background: 'var(--color-success-dim)',
  color: 'var(--color-success)',
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

const skeletonBase: React.CSSProperties = {
  background: 'var(--color-bg-surface)',
  borderRadius: 'var(--radius-md)',
  animation: 'pulse 1.5s ease-in-out infinite',
}

const centeredState: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 320,
  textAlign: 'center',
}
