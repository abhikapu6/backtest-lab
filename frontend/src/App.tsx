import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SidebarLayout } from './layouts/SidebarLayout.js'
import { NewBacktest } from './pages/NewBacktest.js'
import { BacktestResults } from './pages/BacktestResults.js'
import { History } from './pages/History.js'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SidebarLayout />}>
          <Route path="/backtest/new" element={<NewBacktest />} />
          <Route path="/backtest/:id" element={<BacktestResults />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<Navigate to="/backtest/new" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
