import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320,
          textAlign: 'center',
          padding: 'var(--space-8)',
        }}>
          <span style={{ fontSize: 40, marginBottom: 'var(--space-4)' }}>💥</span>
          <h2 style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: 'var(--space-2)',
          }}>
            Something went wrong
          </h2>
          <p style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-5)',
            maxWidth: 420,
          }}>
            An unexpected error occurred in this part of the app.
          </p>
          {this.state.error && (
            <pre style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-danger)',
              background: 'var(--color-danger-dim)',
              border: '1px solid var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
              maxWidth: 560,
              overflowX: 'auto',
              textAlign: 'left',
              marginBottom: 'var(--space-5)',
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 18px',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 500,
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
