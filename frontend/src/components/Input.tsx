import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, id, style, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--color-text-muted)',
          }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        style={{
          padding: '8px 12px',
          fontSize: 'var(--text-base)',
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text)',
          background: 'var(--color-bg-surface)',
          border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)',
          outline: 'none',
          transition: 'border-color var(--transition-fast)',
          width: '100%',
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-border-focus)'
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-border)'
          props.onBlur?.(e)
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>
          {error}
        </span>
      )}
    </div>
  )
}
