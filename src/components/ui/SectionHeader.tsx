import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface SectionHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  action?: ReactNode
  headingLevel?: 1 | 2 | 3 | 4
  titleId?: string
}

export function SectionHeader({
  title,
  description,
  eyebrow,
  action,
  headingLevel = 2,
  titleId,
  className,
  ...props
}: SectionHeaderProps) {
  const Heading = `h${headingLevel}` as const

  return (
    <div
      className={cn(
        'flex flex-wrap items-end justify-between gap-x-5 gap-y-2 border-b border-rule pb-2.5',
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-0.5 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {eyebrow}
          </p>
        ) : null}
        <Heading
          id={titleId}
          className="font-serif text-xl font-semibold leading-tight text-ink sm:text-2xl"
        >
          {title}
        </Heading>
        {description ? <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0 text-sm">{action}</div> : null}
    </div>
  )
}
