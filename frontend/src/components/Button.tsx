import { useRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
  loading?: boolean
}

const variantClass: Record<Variant, string> = {
  primary: 'btn btn--primary',
  secondary: 'btn btn--secondary',
  ghost: 'btn btn--ghost',
  danger: 'btn btn--danger',
}

const sizeClass: Record<Size, string> = {
  sm: 'btn--sm',
  md: 'btn--md',
  lg: 'btn--lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  style,
  type = 'button',
  children,
  onPointerDown,
  ...props
}: ButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null)

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    onPointerDown?.(e)
    const btn = btnRef.current
    if (!btn || disabled || loading) return
    const rect = btn.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const span = document.createElement('span')
    span.className = 'btn__ripple'
    span.style.left = `${x}px`
    span.style.top = `${y}px`
    btn.appendChild(span)
    span.addEventListener('animationend', () => span.remove())
  }

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled || loading}
      className={`${variantClass[variant]} ${sizeClass[size]} ${className}`.trim()}
      style={style}
      onPointerDown={handlePointerDown}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

function Spinner() {
  return (
    <svg className="btn__spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
