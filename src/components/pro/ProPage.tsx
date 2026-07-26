import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  Landmark,
  ListChecks,
  Plane,
  ReceiptText,
  Scale,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import { PRO_ROUTES } from '../../lib/pro'
import { cn } from '../../lib/utils'

const routeIcons = [
  BarChart3,
  ListChecks,
  WalletCards,
  ReceiptText,
  Plane,
  Scale,
  CalendarDays,
  BookOpenCheck,
  Landmark,
  ShieldCheck,
] as const

interface ProPageProps {
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
}

export function ProPage({ title, description, actions, children }: ProPageProps) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-poker-green/20 bg-poker-green text-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-gold-light">
              My Poker
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/75">{description}</p>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
        <nav
          aria-label="Professional poker sections"
          className="flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-2"
        >
          {PRO_ROUTES.map((route, index) => {
            const Icon = routeIcons[index]
            return (
              <NavLink
                key={route.path}
                to={route.path}
                end={route.path === '/pro'}
                className={({ isActive }) =>
                  cn(
                    'flex min-w-fit items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                    isActive
                      ? 'bg-white text-poker-green shadow-sm'
                      : 'text-white/70 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {route.label}
              </NavLink>
            )
          })}
        </nav>
      </section>
      {children}
    </div>
  )
}
