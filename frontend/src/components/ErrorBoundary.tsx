import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Button } from './Button.js'

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
        <div className="empty-state error-boundary">
          <div className="error-boundary__icon" aria-hidden>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h2 className="empty-state__title">Something went wrong</h2>
          <p className="empty-state__text">
            An unexpected error occurred in this part of the app.
          </p>
          {this.state.error && (
            <pre className="error-boundary__trace">
              {this.state.error.message}
            </pre>
          )}
          <Button variant="primary" onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
