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
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-screen items-center justify-center bg-bg p-5 outline-none"
      >
        <section
          className="w-full max-w-lg rounded border border-rule-strong bg-ivory p-6 sm:p-8"
          role="alert"
        >
          <h1 className="font-serif text-2xl font-semibold text-ink">Something went wrong</h1>
          <code className="mt-4 block overflow-auto rounded-sm border border-rule bg-bg p-3 text-left text-sm text-ink">
            {this.state.error.message}
          </code>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </section>
      </main>
    )
  }
}
