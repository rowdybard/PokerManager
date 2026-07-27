import { Link } from 'react-router'
import { cn } from '../../lib/utils'

export interface BrandLockupProps {
  to?: string
  inverse?: boolean
  compact?: boolean
  className?: string
}

export function BrandLockup({
  to = '/',
  inverse = false,
  compact = false,
  className,
}: BrandLockupProps) {
  return (
    <Link
      to={to}
      aria-label="PokerManager home"
      className={cn('nav-link inline-flex min-w-0 items-center gap-2.5', className)}
    >
      <img
        src="/logo.png"
        alt=""
        width="44"
        height="44"
        decoding="async"
        className="size-11 shrink-0 rounded-sm object-cover"
        aria-hidden="true"
      />
      <span className={cn('min-w-0 leading-none', compact && 'hidden min-[390px]:block')}>
        <span
          className={cn(
            'block truncate font-brand text-2xl font-normal leading-none tracking-normal',
            inverse ? 'text-gold-leaf' : 'text-felt-deep',
          )}
        >
          PokerManager
        </span>
        <span
          className={cn(
            'mt-1 block truncate text-[0.58rem] font-semibold uppercase tracking-[0.18em]',
            inverse ? 'text-ivory/75' : 'text-gold',
          )}
        >
          Private poker suite
        </span>
      </span>
    </Link>
  )
}
