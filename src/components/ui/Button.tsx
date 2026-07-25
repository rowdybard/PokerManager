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
        'inline-flex items-center justify-center rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:pointer-events-none disabled:opacity-50',
        {
          'bg-poker-green hover:opacity-90 text-white': variant === 'primary',
          'bg-card hover:bg-border text-white border border-border': variant === 'secondary',
          'hover:bg-card text-gray-300': variant === 'ghost',
          'bg-red-900 hover:opacity-90 text-white': variant === 'danger',
        },
        {
          'h-11 px-4 text-base': size === 'sm',
          'h-12 px-5 text-base': size === 'md',
          'h-14 px-6 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    />
  )
}
