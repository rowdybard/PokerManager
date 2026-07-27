import { cn } from '../../lib/utils'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet' | 'destructive' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex min-w-0 items-center justify-center rounded-sm border font-sans font-semibold leading-none transition-colors disabled:pointer-events-none disabled:opacity-50',
        {
          'border-felt bg-felt text-ivory hover:border-felt-deep hover:bg-felt-deep':
            variant === 'primary',
          'border-rule-strong bg-ivory text-ink hover:border-ink-soft hover:bg-bg':
            variant === 'secondary',
          'border-transparent bg-transparent text-ink-soft underline-offset-4 hover:bg-felt/8 hover:text-ink':
            variant === 'quiet' || variant === 'ghost',
          'border-danger bg-danger text-white hover:bg-loss':
            variant === 'destructive' || variant === 'danger',
        },
        {
          'min-h-9 px-3 text-sm': size === 'sm',
          'min-h-11 px-4 text-sm': size === 'md',
          'min-h-12 px-5 text-base': size === 'lg',
        },
        size === 'sm'
          && ['primary', 'destructive', 'danger'].includes(variant)
          && 'min-h-11',
        className,
      )}
      {...props}
    />
  )
})
