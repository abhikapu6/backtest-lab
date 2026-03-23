import { NavLink, Outlet } from 'react-router-dom'
import type { CSSProperties } from 'react'

const navItems = [
  { to: '/backtest/new', label: 'Run Backtest', icon: PlayIcon },
  { to: '/history', label: 'History', icon: ClockIcon },
]

export function SidebarLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={sidebarStyle}>
        <div style={logoStyle}>
          <ChartIcon />
          <span>Backtest Lab</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                ...navLinkBase,
                background: isActive ? 'var(--color-primary-ghost)' : 'transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontWeight: isActive ? 600 : 400,
              })}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={footerStyle}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-dim)' }}>
            v0.1.0
          </span>
        </div>
      </aside>

      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  )
}

/* ── Styles ──────────────────────────────────────────────────────── */

const sidebarStyle: CSSProperties = {
  width: 'var(--sidebar-width)',
  flexShrink: 0,
  background: 'var(--color-bg-raised)',
  borderRight: '1px solid var(--color-border)',
  display: 'flex',
  flexDirection: 'column',
  padding: 'var(--space-6) var(--space-4)',
  gap: 'var(--space-6)',
  position: 'fixed',
  top: 0,
  left: 0,
  bottom: 0,
  overflowY: 'auto',
}

const logoStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  fontSize: 'var(--text-lg)',
  fontWeight: 700,
  color: 'var(--color-text)',
  paddingLeft: 'var(--space-2)',
}

const navLinkBase: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-sm)',
  textDecoration: 'none',
  transition: 'background var(--transition-fast), color var(--transition-fast)',
}

const footerStyle: CSSProperties = {
  marginTop: 'auto',
  paddingLeft: 'var(--space-2)',
}

const mainStyle: CSSProperties = {
  marginLeft: 'var(--sidebar-width)',
  flex: 1,
  padding: 'var(--space-8)',
  minWidth: 0,
  maxWidth: 1200,
}

/* ── Icons ───────────────────────────────────────────────────────── */

function ChartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-8 4 4 6-10" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
