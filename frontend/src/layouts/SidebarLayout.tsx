import { NavLink, Outlet } from 'react-router-dom'
import { ErrorBoundary } from '../components/index.js'

const navItems = [
  { to: '/backtest/new', label: 'Run Backtest', icon: PlayIcon },
  { to: '/history', label: 'History', icon: ClockIcon },
]

export function SidebarLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__glow" aria-hidden />
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            <ChartIcon />
          </div>
          <div>
            <span className="sidebar__title">Backtest Lab</span>
            <p className="sidebar__tagline">Simulate. Measure. Iterate.</p>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Main">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}>
              <span className="sidebar__link-icon">
                <Icon />
              </span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <span className="sidebar__version">v0.1.0</span>
        </div>
      </aside>

      <main className="app-main">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}

/* ── Icons ───────────────────────────────────────────────────────── */

function ChartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M7 16l4-8 4 4 6-10" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
