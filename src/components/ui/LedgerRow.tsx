import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface LedgerRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  leading?: ReactNode
  title: ReactNode
  meta?: ReactNode
  value?: ReactNode
  detail?: ReactNode
  action?: ReactNode
}

export function LedgerRow({
  leading,
  title,
  meta,
  value,
  detail,
  action,
  className,
  ...props
}: LedgerRowProps) {
  return (
    <div
      className={cn(
        'grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-rule px-1 py-2.5 last:border-b-0',
        className,
      )}
      {...props}
    >
      {leading ? <div className="row-span-2 shrink-0">{leading}</div> : null}
      <div className="min-w-0">
        <div className="truncate font-medium text-ink">{title}</div>
        {meta ? <div className="mt-0.5 truncate text-xs text-muted">{meta}</div> : null}
      </div>
      {value ? <div className="tnum text-right font-medium text-ink">{value}</div> : null}
      {detail ? (
        <div className="col-start-2 mt-0.5 text-sm text-ink-soft empty:hidden">{detail}</div>
      ) : null}
      {action ? <div className="col-start-3 row-span-2 row-start-1 ml-1">{action}</div> : null}
    </div>
  )
}
