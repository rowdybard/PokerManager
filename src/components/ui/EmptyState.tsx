import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-36 flex-col items-center justify-center border border-dashed border-rule-strong bg-ivory px-5 py-7 text-center',
        className,
      )}
      {...props}
    >
      {icon ? <div className="mb-2 text-gold" aria-hidden="true">{icon}</div> : null}
      <p className="font-serif text-lg font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
