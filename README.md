# Backtest Lab

A web application for running and analysing historical backtests of trading strategies on daily OHLCV data.

---

## Quick start

```bash
# Install all workspace dependencies
npm install

# Start both backend and frontend dev servers
npm run dev
# Backend  → http://localhost:3001
# Frontend → http://localhost:5173  (or next available port)
```

**Prerequisites**: Node 22+, PostgreSQL running, `.env` in `backend/` with `DATABASE_URL`.

```bash
# First-time database setup (run inside backend/)
cd backend
npm run db:migrate   # apply Prisma migrations
npm run db:seed      # seed OHLCV data for SPY, QQQ, AAPL, MSFT, TSLA (2015–2025)
```

---

## Project structure

```
backtest-lab/
├── backend/          Express API + backtest engine
│   ├── src/
│   │   ├── engine/           Core simulator + strategies + indicators
│   │   │   ├── simulator.ts
│   │   │   ├── cost-model.ts
│   │   │   ├── types.ts
│   │   │   └── strategies/   sma-crossover, rsi-mean-reversion, bollinger-bands
│   │   ├── services/
│   │   │   ├── backtest-runner.ts   Full pipeline: run → persist
│   │   │   └── metrics.ts           Analytics calculations
│   │   ├── routes/
│   │   │   ├── backtests.ts
│   │   │   └── strategies.ts
│   │   └── db/
│   │       ├── client.ts    Prisma + pg adapter
│   │       └── validation.ts  Symbol/date validation helpers
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
└── frontend/         React 19 + Vite + React Router + Recharts
    └── src/
        ├── layouts/  SidebarLayout
        ├── pages/    NewBacktest, BacktestResults, History
        └── components/  Button, Card, Input, Select, Toggle, Table, KpiCard, ErrorBoundary
```

---

## Execution assumptions

### Simulation loop

Each bar advances through three phases in strict order:

1. **Execute** — Orders queued from the *previous* bar's signal are executed at today's **open price**. This enforces the no-lookahead rule: a strategy signal generated at close of day *N* fills at the open of day *N+1*.
2. **Mark-to-market** — Portfolio equity is calculated using the current bar's **close price** for open positions, plus cash.
3. **Signal** — The strategy function is called with all bars *up to and including the current bar*, and returns a signal (`long` / `flat`) to be executed on the *next* bar.

Remaining open positions at the end of the date range are **force-closed at the final bar's close price**.

### Position sizing

- **Long-only**: the engine does not support short selling.
- **One position per symbol** at a time (fully in or fully out).
- **Full allocation**: for a single symbol, the entire capital allocation is invested. For multiple symbols, capital is split equally upfront (e.g. 3 symbols → each gets `initialCapital / 3`). Allocations do not rebalance between symbols during the run.
- **Whole shares only**: `Math.floor(availableCash / execPrice)` — fractional shares are not purchased.

### Multi-symbol

Only **dates common to all symbols** are simulated (inner join on trading dates). A symbol's bar history seen by the strategy function contains only bars on those common dates.

### Date range

- Data covers 2015-01-02 to 2025-12-30 (daily, US market days).
- All dates are treated as UTC midnight (`@db.Date` in Prisma). No timezone conversions are applied.
- Non-trading days (weekends, US market holidays) are naturally absent from the candle data.

---

## Cost model

Controlled per-run via `costModel` in the API request body.

| Field | Type | Default | Description |
|---|---|---|---|
| `enabled` | boolean | `false` | Master switch. If `false`, no costs are applied. |
| `commissionPerTrade` | number ($) | `0` | Flat commission deducted on every **entry** and **exit**. |
| `slippageBps` | number (bps) | `0` | Execution price slippage in basis points. Buys execute at `open × (1 + bps/10000)`; sells at `open × (1 − bps/10000)`. |

PnL accounting with costs:

```
entry cost basis = shares × entryPrice  (slippage already in entryPrice)
exit proceeds    = shares × exitPrice − commission
pnl              = exitProceeds − entryCostBasis − entryCommission
```

---

## Strategies

### SMA Crossover

Go long when `fastSMA > slowSMA`; exit when `fastSMA ≤ slowSMA`.

| Param | Default | Range | Description |
|---|---|---|---|
| `fastWindow` | 10 | 2–100 | Fast SMA period |
| `slowWindow` | 50 | 10–400 | Slow SMA period |

### RSI Mean Reversion

Go long when RSI drops below `oversold`; exit when RSI rises above `overbought`. Uses Wilder's exponential smoothing.

| Param | Default | Range | Description |
|---|---|---|---|
| `lookback` | 14 | 2–100 | RSI calculation period |
| `oversold` | 30 | 5–50 | Entry threshold |
| `overbought` | 70 | 50–95 | Exit threshold |

### Bollinger Bands

Go long when price drops below the lower band (`middle − numStdDevs × σ`); exit when price recovers above the middle band.

| Param | Default | Range | Description |
|---|---|---|---|
| `window` | 20 | 5–100 | Lookback for mean and standard deviation |
| `numStdDevs` | 2.0 | 0.5–4 | Band width multiplier |

---

## Metrics reference

All metrics are computed from the simulation output (no external benchmark).

| Metric | Formula |
|---|---|
| **Total Return** | `(finalEquity − initialCapital) / initialCapital` |
| **CAGR** | `(finalEquity / initialCapital)^(1 / years) − 1`, where `years = tradingDays / 252` |
| **Sharpe Ratio** | `(meanDailyReturn / stdDailyReturn) × √252` (risk-free rate = 0) |
| **Volatility** | `stdDailyReturn × √252` (annualised) |
| **Max Drawdown** | `min((equity − peakEquity) / peakEquity)` over all bars |
| **Win Rate** | `winningTrades / totalTrades` |
| **Profit Factor** | `grossProfit / grossLoss` (capped at 999.99 if no losing trades) |
| **Num Trades** | Count of completed round-trip trades |

---

## API reference

Base URL: `http://localhost:3001`

### `GET /api/health`
Returns server status and candle data summary.

### `GET /api/strategies`
Returns all registered strategies with their parameter schemas.

### `POST /api/backtests`
Run a new backtest. Returns `{ id }` on success.

**Request body:**
```json
{
  "symbols": ["SPY", "QQQ"],
  "startDate": "2020-01-01",
  "endDate": "2023-12-31",
  "strategyId": "sma-crossover",
  "params": { "fastWindow": 10, "slowWindow": 50 },
  "costModel": { "enabled": true, "commissionPerTrade": 1, "slippageBps": 5 },
  "initialCapital": 10000
}
```

### `GET /api/backtests`
Paginated history. Query params: `?page=1&limit=20`.

### `GET /api/backtests/:id`
Full metadata + metrics + config for one run.

### `GET /api/backtests/:id/equity`
Returns `{ equity: [{ date, equity, drawdown }] }` — one point per trading day.

### `GET /api/backtests/:id/trades`
Returns `{ trades: [{ symbol, entryDate, exitDate, entryPrice, exitPrice, pnl, returnPct }] }`.

---

## Running tests

```bash
cd backend
npm test            # run all unit + integration tests once
npm run test:watch  # watch mode during development
```

**Test suites:**

| File | Coverage |
|---|---|
| `engine/__tests__/indicators.test.ts` | `sma`, `stdDev`, `rsi` — boundary conditions, known values |
| `engine/__tests__/simulator.test.ts` | No-lookahead, PnL, equity series, drawdown, multi-symbol split |
| `services/__tests__/metrics.test.ts` | totalReturn, CAGR, Sharpe, maxDrawdown, winRate, profitFactor |
| `engine/__tests__/integration.test.ts` | Full pipeline: synthetic bars → simulate → computeMetrics for all three strategies |

Tests use **Vitest** and are pure in-memory — no database connection required.

---

## Reproducing a specific run

Every backtest is stored with its full configuration. To reproduce:

1. Fetch the config: `GET /api/backtests/:id`
2. Extract `strategy`, `symbols`, `startDate`, `endDate`, `params`, `costModel`, `initialCapital`
3. Submit the same body to `POST /api/backtests`

Results will be identical as long as the underlying candle data has not changed, because the simulation is fully deterministic given the same inputs.

---

## Performance

| Scenario | Measured |
|---|---|
| 3 symbols × 10 years (7 548 candles) | ~260ms total (DB load + simulation) |
| Target | < 2 000ms |

The engine is O(d × s) in the main loop where d = trading days and s = symbols. No lookahead means bars are processed strictly forward in time.
