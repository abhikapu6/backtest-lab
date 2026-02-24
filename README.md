# Backtesting Lab

Algorithmic trading research platform for testing built-in strategies across financial instruments.

## Project Structure

```
backtest-lab/
├── frontend/          React + TypeScript + Vite
│   ├── src/           Components, pages, hooks
│   ├── public/        Static assets
│   └── vite.config.ts Vite config (proxies /api to backend)
├── backend/           Node + Express + TypeScript
│   └── src/
│       ├── routes/    API route handlers
│       ├── services/  Business logic
│       ├── engine/    Backtest simulation engine
│       └── db/        Database access layer
└── package.json       Root workspace config
```

## Getting Started

```bash
# Install all dependencies (both frontend and backend)
npm install

# Run both frontend and backend in dev mode
npm run dev
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:3001
- Health:   http://localhost:3001/api/health

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend in parallel |
| `npm run dev:frontend` | Start frontend only |
| `npm run dev:backend` | Start backend only |
| `npm run build` | Build frontend for production |

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, React Router
- **Backend**: Express 5, TypeScript, tsx (dev runner)
- **Database**: PostgreSQL (Phase 1)
