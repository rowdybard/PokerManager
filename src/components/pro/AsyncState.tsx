import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, LoaderCircle, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'

export function ProLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="flex min-h-40 items-center justify-center gap-2 border border-rule bg-ivory text-sm text-muted"
      role="status"
    >
      <LoaderCircle className="h-5 w-5 animate-spin text-gold" aria-hidden="true" />
      {label}
    </div>
  )
}
export function ProError({
  error,
  retry,
  title = 'Could not load this section',
}: {
  error: string
  retry?: () => void
  title?: string
}) {
  return (
    <div className="border-l-4 border-danger bg-danger/5 p-4" role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-muted">{error}</p>
          {retry ? (
            <Button className="mt-3 gap-2" size="sm" variant="secondary" onClick={retry}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function ProEmpty({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center border border-rule bg-ivory p-5 text-center">
      <div className="mb-3 rounded-full bg-cream p-3 text-muted">
        <Inbox className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="font-semibold text-ink">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
