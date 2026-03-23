import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
  loading?: boolean
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--color-primary)',
    color: '#fff',
    border: '1px solid transparent',
  },
  secondary: {
    background: 'var(--color-bg-surface)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-muted)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'var(--color-danger)',
    color: '#fff',
    border: '1px solid transparent',
  },
}

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: 'var(--text-sm)' },
  md: { padding: '8px 16px', fontSize: 'var(--text-base)' },
  lg: { padding: '10px 20px', fontSize: 'var(--text-lg)' },
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  style,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        borderRadius: 'var(--radius-md)',
        fontWeight: 500,
        fontFamily: 'var(--font-sans)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        transition: 'background var(--transition-fast), border-color var(--transition-fast)',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
