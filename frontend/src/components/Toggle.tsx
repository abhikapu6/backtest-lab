interface ToggleProps {
  label?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function Toggle({ label, checked, onChange, disabled = false }: ToggleProps) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
      }}
    >
      <button
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          width: 36,
          height: 20,
          borderRadius: 10,
          border: 'none',
          background: checked ? 'var(--color-primary)' : 'var(--color-bg-surface)',
          cursor: 'inherit',
          transition: 'background var(--transition-fast)',
          flexShrink: 0,
          outline: `1px solid ${checked ? 'transparent' : 'var(--color-border)'}`,
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left var(--transition-fast)',
            boxShadow: 'var(--shadow-sm)',
          }}
        />
      </button>
      {label && (
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
          {label}
        </span>
      )}
    </label>
  )
}
