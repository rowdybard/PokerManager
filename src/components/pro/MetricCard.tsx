import type { LucideIcon } from 'lucide-react'
import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string
  detail?: string
  icon: LucideIcon
  tone?: 'default' | 'positive' | 'negative' | 'gold'
}) {
  return (
    <Card className="min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p
            className={cn('mt-1 truncate text-2xl font-bold tabular-nums', {
              'text-ink': tone === 'default',
              'text-success': tone === 'positive',
              'text-danger': tone === 'negative',
              'text-gold': tone === 'gold',
            })}
          >
            {value}
          </p>
          {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
        </div>
        <div className="rounded-lg bg-cream p-2 text-gold">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </Card>
  )
}
