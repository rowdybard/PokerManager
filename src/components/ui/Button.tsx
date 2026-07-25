import { cn } from '../../lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 disabled:pointer-events-none disabled:opacity-50',
        {
          'bg-poker-green hover:bg-poker-green-dark text-white shadow-sm': variant === 'primary',
          'bg-cream hover:bg-border text-ink border border-border shadow-sm': variant === 'secondary',
          'hover:bg-cream text-muted hover:text-ink': variant === 'ghost',
          'bg-danger hover:opacity-90 text-white shadow-sm': variant === 'danger',
        },
        {
          'h-9 px-3 text-sm': size === 'sm',
          'h-11 px-5 text-base': size === 'md',
          'h-12 px-6 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    />
  )
}
