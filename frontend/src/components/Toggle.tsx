interface ToggleProps {
  label?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function Toggle({ label, checked, onChange, disabled = false }: ToggleProps) {
  return (
    <label className={`toggle ${disabled ? 'toggle--disabled' : ''}`}>
      <button
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`toggle__track ${checked ? 'toggle__track--on' : ''}`}
      >
        <span className="toggle__thumb" />
      </button>
      {label && <span className="toggle__label">{label}</span>}
    </label>
  )
}
