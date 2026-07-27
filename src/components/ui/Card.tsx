import { cn } from '../../lib/utils'
import type { ElementType, HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded border border-rule bg-card p-5',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: CardProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 pb-4', className)} {...props} />
  )
}

export function CardTitle({
  as: Component = 'h2',
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & {
  as?: Extract<ElementType, 'h1' | 'h2' | 'h3' | 'h4'>
}) {
  return (
    <Component
      className={cn('font-serif text-xl font-semibold leading-tight text-ink', className)}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={cn('', className)} {...props} />
}
