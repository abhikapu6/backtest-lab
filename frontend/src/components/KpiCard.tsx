import type { CSSProperties } from 'react'

interface KpiCardProps {
  label: string
  value: string
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  style?: CSSProperties
}

const trendColors: Record<string, string> = {
  up: 'var(--color-success)',
  down: 'var(--color-danger)',
  neutral: 'var(--color-text-muted)',
}

export function KpiCard({ label, value, subValue, trend = 'neutral', style }: KpiCardProps) {
  return (
    <div
      style={{
        background: 'var(--color-bg-raised)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
        minWidth: 0,
        ...style,
      }}
    >
      <span
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 500,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 700,
          color: trendColors[trend],
          fontFamily: 'var(--font-mono)',
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
      {subValue && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-dim)' }}>
          {subValue}
        </span>
      )}
    </div>
  )
}
