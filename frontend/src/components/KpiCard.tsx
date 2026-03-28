import type { CSSProperties } from 'react'

interface KpiCardProps {
  label: string
  value: string
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  style?: CSSProperties
}

const trendClass: Record<string, string> = {
  up: 'kpi-card__value--up',
  down: 'kpi-card__value--down',
  neutral: 'kpi-card__value--neutral',
}

export function KpiCard({ label, value, subValue, trend = 'neutral', style }: KpiCardProps) {
  return (
    <div className="kpi-card" style={style}>
      <span className="kpi-card__label">{label}</span>
      <span className={`kpi-card__value ${trendClass[trend]}`}>{value}</span>
      {subValue && <span className="kpi-card__sub">{subValue}</span>}
    </div>
  )
}
