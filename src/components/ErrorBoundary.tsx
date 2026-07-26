import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui/Button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Unhandled application error', error, info)
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6">
        <section
          className="w-full max-w-lg rounded-2xl border border-border bg-white p-8 text-center shadow-sm"
          role="alert"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-danger">
            Poker Manager hit a problem
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink">Your data is still safe.</h1>
          <p className="mt-3 text-muted">
            Reload the app. If the problem continues, copy the message below for support.
          </p>
          <code className="mt-5 block overflow-auto rounded-lg bg-cream p-3 text-left text-sm text-ink">
            {this.state.error.message}
          </code>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Reload Poker Manager
          </Button>
        </section>
      </main>
    )
  }
}
