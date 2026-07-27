import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface StatColumnItem {
  key?: string
  label: ReactNode
  value: ReactNode
  detail?: ReactNode
  tone?: 'default' | 'profit' | 'loss'
}

export interface StatColumnsProps extends HTMLAttributes<HTMLDListElement> {
  items: StatColumnItem[]
}

export function StatColumns({ items, className, ...props }: StatColumnsProps) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 border-y border-rule sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]',
        className,
      )}
      {...props}
    >
      {items.map((item, index) => (
        <div
          key={item.key ?? index}
          className="min-w-0 border-b border-r border-rule px-3 py-3 last:border-r-0 sm:border-b-0"
        >
          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            {item.label}
          </dt>
          <dd
            className={cn(
              'tnum mt-1 font-serif text-xl font-semibold text-ink',
              item.tone === 'profit' && 'text-profit',
              item.tone === 'loss' && 'text-loss',
            )}
          >
            {item.value}
          </dd>
          {item.detail ? <dd className="mt-0.5 text-xs text-muted">{item.detail}</dd> : null}
        </div>
      ))}
    </dl>
  )
}
