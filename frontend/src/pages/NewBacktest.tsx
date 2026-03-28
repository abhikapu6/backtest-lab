import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Card, Input, Select, Toggle } from '../components/index.js'

export interface CloneState {
  symbols: string[]
  startDate: string
  endDate: string
  strategyId: string
  params: Record<string, number>
  costEnabled: boolean
  commission: string
  slippage: string
  stopLossEnabled: boolean
  stopLoss: string
  initialCapital: string
}

const SYMBOLS: { ticker: string; label: string; group: string }[] = [
  { ticker: 'SPY',  label: 'SPY – S&P 500',       group: 'ETFs' },
  { ticker: 'QQQ',  label: 'QQQ – Nasdaq 100',     group: 'ETFs' },
  { ticker: 'IWM',  label: 'IWM – Russell 2000',   group: 'ETFs' },
  { ticker: 'GLD',  label: 'GLD – Gold',            group: 'ETFs' },
  { ticker: 'TLT',  label: 'TLT – 20yr Treasuries', group: 'ETFs' },
  { ticker: 'AAPL', label: 'AAPL – Apple',          group: 'Equities' },
  { ticker: 'MSFT', label: 'MSFT – Microsoft',      group: 'Equities' },
  { ticker: 'NVDA', label: 'NVDA – NVIDIA',         group: 'Equities' },
  { ticker: 'AMZN', label: 'AMZN – Amazon',         group: 'Equities' },
  { ticker: 'TSLA', label: 'TSLA – Tesla',          group: 'Equities' },
]

interface ParamDescriptor {
  name: string
  label: string
  description: string
  type: 'int' | 'float'
  min: number
  max: number
  step: number
  default: number
}

interface StrategyInfo {
  id: string
  name: string
  description: string
  params: ParamDescriptor[]
}

interface FormState {
  symbols: string[]
  startDate: string
  endDate: string
  strategyId: string
  params: Record<string, number>
  costEnabled: boolean
  commission: string
  slippage: string
  stopLossEnabled: boolean
  stopLoss: string
  initialCapital: string
}

const initialForm: FormState = {
  symbols: ['SPY'],
  startDate: '2020-01-01',
  endDate: '2024-12-31',
  strategyId: '',
  params: {},
  costEnabled: false,
  commission: '1.00',
  slippage: '5',
  stopLossEnabled: false,
  stopLoss: '5',
  initialCapital: '10000',
}

export function NewBacktest() {
  const navigate = useNavigate()
  const location = useLocation()
  const cloned = location.state as CloneState | null
  const [strategies, setStrategies] = useState<StrategyInfo[]>([])
  const [form, setForm] = useState<FormState>(cloned ?? initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    fetch('/api/strategies')
      .then((r) => r.json())
      .then((data) => {
        const list: StrategyInfo[] = data.strategies
        setStrategies(list)
        if (!cloned && list.length > 0) {
          const first = list[0]
          setForm((f) => ({
            ...f,
            strategyId: first.id,
            params: Object.fromEntries(first.params.map((p) => [p.name, p.default])),
          }))
        }
      })
      .catch(() => setSubmitError('Failed to load strategies'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedStrategy = strategies.find((s) => s.id === form.strategyId)

  function toggleSymbol(symbol: string) {
    setForm((f) => {
      const has = f.symbols.includes(symbol)
      const next = has ? f.symbols.filter((s) => s !== symbol) : [...f.symbols, symbol]
      return { ...f, symbols: next }
    })
    setErrors((e) => ({ ...e, symbols: '' }))
  }

  function setParam(name: string, value: number) {
    setForm((f) => ({ ...f, params: { ...f.params, [name]: value } }))
  }

  function selectStrategy(id: string) {
    const entry = strategies.find((s) => s.id === id)
    if (!entry) return
    setForm((f) => ({
      ...f,
      strategyId: id,
      params: Object.fromEntries(entry.params.map((p) => [p.name, p.default])),
    }))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}

    if (form.symbols.length === 0) errs.symbols = 'Select at least one symbol'
    if (!form.startDate) errs.startDate = 'Required'
    if (!form.endDate) errs.endDate = 'Required'
    if (form.startDate && form.endDate && form.startDate >= form.endDate) {
      errs.endDate = 'Must be after start date'
    }
    if (!form.strategyId) errs.strategyId = 'Select a strategy'

    if (selectedStrategy) {
      for (const pd of selectedStrategy.params) {
        const v = form.params[pd.name]
        if (v === undefined || isNaN(v)) {
          errs[`param_${pd.name}`] = 'Required'
        } else if (v < pd.min || v > pd.max) {
          errs[`param_${pd.name}`] = `${pd.min} – ${pd.max}`
        }
      }
    }

    const capital = parseFloat(form.initialCapital)
    if (!capital || capital <= 0) errs.initialCapital = 'Must be a positive number'

    if (form.costEnabled) {
      const comm = parseFloat(form.commission)
      if (isNaN(comm) || comm < 0 || comm > 100) errs.commission = '0 – 100'
      const slip = parseFloat(form.slippage)
      if (isNaN(slip) || slip < 0 || slip > 500) errs.slippage = '0 – 500'
    }

    if (form.stopLossEnabled) {
      const sl = parseFloat(form.stopLoss)
      if (isNaN(sl) || sl <= 0 || sl > 50) errs.stopLoss = '0.1 – 50'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return

    setSubmitting(true)
    setSubmitError('')

    try {
      const body = {
        symbols: form.symbols,
        startDate: form.startDate,
        endDate: form.endDate,
        strategyId: form.strategyId,
        params: form.params,
        costModel: {
          enabled: form.costEnabled,
          commissionPerTrade: parseFloat(form.commission) || 0,
          slippageBps: parseFloat(form.slippage) || 0,
          stopLossPercent: form.stopLossEnabled ? parseFloat(form.stopLoss) || 0 : 0,
        },
        initialCapital: parseFloat(form.initialCapital),
      }

      const res = await fetch('/api/backtests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.details?.join('; ') || data.error || 'Request failed')
      }

      const { id } = await res.json()
      navigate(`/backtest/${id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const paramCols = selectedStrategy ? Math.min(selectedStrategy.params.length, 3) : 1

  return (
    <div className="page-narrow">
      <h1 className="page-title page-title--sm" style={{ marginBottom: 'var(--space-8)' }}>
        Run Backtest
      </h1>

      <div className="stack">
        <Card>
          <h2 className="section-label">Asset Universe</h2>
          {(['ETFs', 'Equities'] as const).map((group) => (
            <div key={group} style={{ marginTop: 'var(--space-4)' }}>
              <p className="section-group-title">{group}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {SYMBOLS.filter((s) => s.group === group).map(({ ticker, label }) => {
                  const active = form.symbols.includes(ticker)
                  return (
                    <button
                      key={ticker}
                      type="button"
                      onClick={() => toggleSymbol(ticker)}
                      title={label}
                      className={`chip ${active ? 'chip--active' : ''}`}
                    >
                      {ticker}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {errors.symbols && <span className="field-error" style={{ display: 'block', marginTop: 'var(--space-2)' }}>{errors.symbols}</span>}
        </Card>

        <Card>
          <h2 className="section-label">Date Range</h2>
          <div className="grid-2" style={{ marginTop: 'var(--space-4)' }}>
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) => {
                setForm((f) => ({ ...f, startDate: e.target.value }))
                setErrors((er) => ({ ...er, startDate: '' }))
              }}
              error={errors.startDate}
            />
            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={(e) => {
                setForm((f) => ({ ...f, endDate: e.target.value }))
                setErrors((er) => ({ ...er, endDate: '' }))
              }}
              error={errors.endDate}
            />
          </div>
        </Card>

        <Card>
          <h2 className="section-label">Strategy</h2>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Select
              label="Strategy"
              options={strategies.map((s) => ({ value: s.id, label: s.name }))}
              value={form.strategyId}
              onChange={(e) => selectStrategy(e.target.value)}
              error={errors.strategyId}
            />
          </div>

          {selectedStrategy && (
            <>
              <p className="strategy-callout">{selectedStrategy.description}</p>

              <div
                className="param-grid"
                style={{ gridTemplateColumns: `repeat(${paramCols}, 1fr)` }}
              >
                {selectedStrategy.params.map((pd) => (
                  <Input
                    key={pd.name}
                    label={pd.label}
                    type="number"
                    min={pd.min}
                    max={pd.max}
                    step={pd.step}
                    value={form.params[pd.name] ?? pd.default}
                    onChange={(e) => setParam(pd.name, parseFloat(e.target.value))}
                    error={errors[`param_${pd.name}`]}
                    title={pd.description}
                  />
                ))}
              </div>
            </>
          )}
        </Card>

        <Card>
          <div className="row-between">
            <h2 className="section-label">Transaction Costs</h2>
            <Toggle
              checked={form.costEnabled}
              onChange={(v) => setForm((f) => ({ ...f, costEnabled: v }))}
            />
          </div>

          {form.costEnabled && (
            <div className="grid-2" style={{ marginTop: 'var(--space-4)' }}>
              <Input
                label="Commission per Trade ($)"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.commission}
                onChange={(e) => {
                  setForm((f) => ({ ...f, commission: e.target.value }))
                  setErrors((er) => ({ ...er, commission: '' }))
                }}
                error={errors.commission}
              />
              <Input
                label="Slippage (bps)"
                type="number"
                min={0}
                max={500}
                step={1}
                value={form.slippage}
                onChange={(e) => {
                  setForm((f) => ({ ...f, slippage: e.target.value }))
                  setErrors((er) => ({ ...er, slippage: '' }))
                }}
                error={errors.slippage}
              />
            </div>
          )}
        </Card>

        <Card>
          <div className="row-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <h2 className="section-label">Stop-Loss</h2>
              <p style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-dim)', maxWidth: '18rem' }}>
                Exit a position intrabar when price drops this % below entry
              </p>
            </div>
            <Toggle
              checked={form.stopLossEnabled}
              onChange={(v) => setForm((f) => ({ ...f, stopLossEnabled: v }))}
            />
          </div>

          {form.stopLossEnabled && (
            <div style={{ marginTop: 'var(--space-4)', maxWidth: 220 }}>
              <Input
                label="Stop-Loss (%)"
                type="number"
                min={0.1}
                max={50}
                step={0.5}
                value={form.stopLoss}
                onChange={(e) => {
                  setForm((f) => ({ ...f, stopLoss: e.target.value }))
                  setErrors((er) => ({ ...er, stopLoss: '' }))
                }}
                error={errors.stopLoss}
              />
            </div>
          )}
        </Card>

        <Card>
          <h2 className="section-label">Initial Capital</h2>
          <div style={{ marginTop: 'var(--space-4)', maxWidth: 260 }}>
            <Input
              label="Amount ($)"
              type="number"
              min={1}
              step={100}
              value={form.initialCapital}
              onChange={(e) => {
                setForm((f) => ({ ...f, initialCapital: e.target.value }))
                setErrors((er) => ({ ...er, initialCapital: '' }))
              }}
              error={errors.initialCapital}
            />
          </div>
        </Card>

        {submitError && <div className="alert-error">{submitError}</div>}

        <Button size="lg" loading={submitting} onClick={handleSubmit} style={{ alignSelf: 'flex-start' }}>
          Run Backtest
        </Button>
      </div>
    </div>
  )
}
