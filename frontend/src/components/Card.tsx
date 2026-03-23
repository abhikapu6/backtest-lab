import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  padding?: string
  style?: CSSProperties
  className?: string
}

export function Card({ children, padding = 'var(--space-6)', style, className }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--color-bg-raised)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
