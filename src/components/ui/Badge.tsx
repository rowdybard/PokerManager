import { cn } from '../../lib/utils'
import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'gold' | 'green' | 'red' | 'blue'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        {
          'bg-border text-muted': variant === 'default',
          'bg-gold/15 text-gold': variant === 'gold',
          'bg-poker-green/15 text-poker-green': variant === 'green',
          'bg-danger/10 text-danger': variant === 'red',
          'bg-blue-100 text-blue-700': variant === 'blue',
        },
        className
      )}
      {...props}
    />
  )
}
