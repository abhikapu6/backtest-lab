import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { ErrorBoundary } from '../components/index.js'

const navItems = [
  { to: '/backtest/new', label: 'Run Backtest', icon: PlayIcon },
  { to: '/history', label: 'History', icon: ClockIcon },
]

const EASE = [0.33, 1, 0.68, 1] as [number, number, number, number]

const pageVariants: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: EASE },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.18, ease: EASE },
  },
}

function AnimatedOutlet() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ minHeight: '100%' }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}

function SidebarNav() {
  const location = useLocation()
  return (
    <nav className="sidebar__nav" aria-label="Main">
      {navItems.map(({ to, label, icon: Icon }) => {
        const isActive =
          location.pathname === to ||
          (to === '/backtest/new' && location.pathname.startsWith('/backtest'))
        return (
          <NavLink
            key={to}
            to={to}
            className={`sidebar__link sidebar__link--motion ${isActive ? 'sidebar__link--active' : ''}`}
          >
            {isActive && (
              <motion.div
                layoutId="sidebar-active-pill"
                className="sidebar__active-bg"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
            <span className="sidebar__link-icon" style={{ position: 'relative', zIndex: 1 }}>
              <Icon />
            </span>
            <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

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

        <SidebarNav />

        <div className="sidebar__footer">
          <span className="sidebar__version">v0.1.0</span>
        </div>
      </aside>

      <main className="app-main">
        <ErrorBoundary>
          <AnimatedOutlet />
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
