import type { LucideIcon } from 'lucide-react'
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
    <div className="min-w-0 border-b border-rule p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p
            className={cn('tnum mt-1 break-words text-2xl font-bold', {
              'text-ink': tone === 'default',
              'text-profit': tone === 'positive',
              'text-loss': tone === 'negative',
              'text-gold': tone === 'gold',
            })}
          >
            {value}
          </p>
          {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
        </div>
        <Icon className="h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
      </div>
    </div>
  )
}
