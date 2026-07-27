import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface RankMedallionProps extends HTMLAttributes<HTMLSpanElement> {
  rank: number | string
}

export function RankMedallion({ rank, className, ...props }: RankMedallionProps) {
  const numericRank = typeof rank === 'number' ? rank : Number(rank)

  return (
    <span
      className={cn(
        'tnum inline-grid size-7 shrink-0 place-items-center rounded-full border border-rule-strong bg-bg font-sans text-xs font-bold text-ink',
        numericRank === 1 && 'border-gold-leaf bg-gold-leaf text-felt-deep',
        numericRank === 2 && 'border-[#9a9589] bg-[#d9d5ca]',
        numericRank === 3 && 'border-[#9a673a] bg-[#bf8655] text-white',
        className,
      )}
      aria-label={`Rank ${rank}`}
      {...props}
    >
      {rank}
    </span>
  )
}
