import { cn } from '../../lib/utils'
import type { HTMLAttributes } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'gold' | 'green' | 'red' | 'blue'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-0.5 font-sans text-xs font-semibold',
        {
          'border-rule bg-bg text-ink-soft': variant === 'default',
          'border-gold/35 bg-gold/10 text-gold': variant === 'gold',
          'border-profit/25 bg-profit/10 text-profit': variant === 'green',
          'border-danger/25 bg-danger/10 text-danger': variant === 'red',
          'border-blue-700/25 bg-blue-100 text-blue-800': variant === 'blue',
        },
        className
      )}
      {...props}
    />
  )
}
