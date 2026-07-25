import { cn } from '../../lib/utils'
import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'gold' | 'green' | 'red' | 'blue'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold',
        {
          'bg-border text-gray-300': variant === 'default',
          'bg-gold/20 text-gold': variant === 'gold',
          'bg-poker-green/30 text-green-400': variant === 'green',
          'bg-red-900/40 text-red-400': variant === 'red',
          'bg-blue-900/40 text-blue-400': variant === 'blue',
        },
        className
      )}
      {...props}
    />
  )
}
