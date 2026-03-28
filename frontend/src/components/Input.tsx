import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, id, className = '', style, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  const err = Boolean(error)
  const controlClass = `input-control ${err ? 'input-control--error' : ''} ${className}`.trim()

  return (
    <div className="field">
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={controlClass}
        style={style}
        {...props}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}
