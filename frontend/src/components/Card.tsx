import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  padding?: string
  style?: CSSProperties
  className?: string
  variant?: 'default' | 'ghost' | 'inset'
}

export function Card({ children, padding = 'var(--space-6)', style, className = '', variant = 'default' }: CardProps) {
  const surfaceClass =
    variant === 'ghost'
      ? 'surface'
      : variant === 'inset'
        ? 'surface surface--inset'
        : 'surface surface--elevated'

  return (
    <div
      className={`${surfaceClass} ${className}`.trim()}
      style={{
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
