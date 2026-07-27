import type { ElementType, HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: Extract<ElementType, 'article' | 'div' | 'section'>
  tone?: 'parchment' | 'plain' | 'felt'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Surface({
  as: Component = 'section',
  className,
  tone = 'parchment',
  padding = 'md',
  ...props
}: SurfaceProps) {
  return (
    <Component
      className={cn(
        'border border-rule',
        {
          'bg-ivory text-ink': tone === 'parchment',
          'bg-card text-ink': tone === 'plain',
          'border-felt-deep bg-felt text-ivory': tone === 'felt',
          'p-0': padding === 'none',
          'p-3 sm:p-4': padding === 'sm',
          'p-4 sm:p-5': padding === 'md',
          'p-5 sm:p-6': padding === 'lg',
        },
        className,
      )}
      {...props}
    />
  )
}
