-- CreateTable
CREATE TABLE "candles" (
    "id" SERIAL NOT NULL,
    "symbol" VARCHAR(10) NOT NULL,
    "date" DATE NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" BIGINT NOT NULL,

    CONSTRAINT "candles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backtests" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "strategy" VARCHAR(50) NOT NULL,
    "symbols" TEXT[],
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "params" JSONB NOT NULL,
    "cost_model" JSONB NOT NULL,
    "initial_capital" DOUBLE PRECISION NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',

    CONSTRAINT "backtests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backtest_metrics" (
    "id" SERIAL NOT NULL,
    "backtest_id" TEXT NOT NULL,
    "total_return" DOUBLE PRECISION NOT NULL,
    "cagr" DOUBLE PRECISION NOT NULL,
    "sharpe" DOUBLE PRECISION NOT NULL,
    "volatility" DOUBLE PRECISION NOT NULL,
    "max_drawdown" DOUBLE PRECISION NOT NULL,
    "win_rate" DOUBLE PRECISION NOT NULL,
    "profit_factor" DOUBLE PRECISION NOT NULL,
    "num_trades" INTEGER NOT NULL,

    CONSTRAINT "backtest_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backtest_equity" (
    "id" SERIAL NOT NULL,
    "backtest_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "equity" DOUBLE PRECISION NOT NULL,
    "drawdown" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "backtest_equity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backtest_trades" (
    "id" SERIAL NOT NULL,
    "backtest_id" TEXT NOT NULL,
    "symbol" VARCHAR(10) NOT NULL,
    "entry_date" DATE NOT NULL,
    "exit_date" DATE NOT NULL,
    "entry_price" DOUBLE PRECISION NOT NULL,
    "exit_price" DOUBLE PRECISION NOT NULL,
    "pnl" DOUBLE PRECISION NOT NULL,
    "return_pct" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "backtest_trades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candles_symbol_idx" ON "candles"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "candles_symbol_date_key" ON "candles"("symbol", "date");

-- CreateIndex
CREATE UNIQUE INDEX "backtest_metrics_backtest_id_key" ON "backtest_metrics"("backtest_id");

-- CreateIndex
CREATE INDEX "backtest_equity_backtest_id_idx" ON "backtest_equity"("backtest_id");

-- CreateIndex
CREATE INDEX "backtest_trades_backtest_id_idx" ON "backtest_trades"("backtest_id");

-- AddForeignKey
ALTER TABLE "backtest_metrics" ADD CONSTRAINT "backtest_metrics_backtest_id_fkey" FOREIGN KEY ("backtest_id") REFERENCES "backtests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backtest_equity" ADD CONSTRAINT "backtest_equity_backtest_id_fkey" FOREIGN KEY ("backtest_id") REFERENCES "backtests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backtest_trades" ADD CONSTRAINT "backtest_trades_backtest_id_fkey" FOREIGN KEY ("backtest_id") REFERENCES "backtests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
