import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface ActionBarProps extends HTMLAttributes<HTMLDivElement> {
  label?: string
  sticky?: boolean
}

export function ActionBar({
  label = 'Page actions',
  sticky = true,
  className,
  children,
  ...props
}: ActionBarProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex flex-wrap items-center justify-end gap-2 border border-rule-strong bg-ivory p-2.5',
        sticky &&
          'sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 shadow-[0_-1px_0_rgba(30,27,22,0.12)] lg:static lg:shadow-none',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
