import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface SummaryBandItem {
  key?: string
  label: ReactNode
  value: ReactNode
  detail?: ReactNode
  icon?: ReactNode
  tone?: 'default' | 'profit' | 'loss'
}

export interface SummaryBandProps {
  items: SummaryBandItem[]
  ariaLabel?: string
  className?: string
}

export function SummaryBand({
  items,
  ariaLabel = 'Summary',
  className,
}: SummaryBandProps) {
  if (items.length === 0) return null

  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        'grid overflow-hidden border border-rule-strong bg-ivory sm:grid-cols-2 xl:grid-cols-4',
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.key ?? index}
          className={cn(
            'min-w-0 px-4 py-4 sm:px-5',
            index > 0 && 'border-t border-rule sm:border-t-0 sm:border-l',
            index > 1 && 'sm:border-t xl:border-t-0',
            index % 2 === 0 && index > 0 && 'sm:border-l-0 xl:border-l',
          )}
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
            {item.icon ? <span className="text-gold" aria-hidden="true">{item.icon}</span> : null}
            <span>{item.label}</span>
          </div>
          <div
            className={cn(
              'tnum mt-1.5 font-serif text-2xl font-semibold leading-none text-ink',
              item.tone === 'profit' && 'text-profit',
              item.tone === 'loss' && 'text-loss',
            )}
          >
            {item.value}
          </div>
          {item.detail ? <div className="mt-1.5 text-sm text-muted">{item.detail}</div> : null}
        </div>
      ))}
    </section>
  )
}
