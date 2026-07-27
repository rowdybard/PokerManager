import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import {
  AirplaneTilt,
  ArrowsClockwise,
  BookOpen,
  CalendarBlank,
  ChartLineUp,
  Coins,
  DotsThree,
  FileText,
  GameController,
  HandCoins,
  House,
  SignOut,
  Trophy,
  Wallet,
} from '@phosphor-icons/react'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../lib/utils'
import { Modal } from '../ui/Modal'
import { BrandLockup } from './BrandLockup'

const desktopNavItems = [
  { icon: House, label: 'Home', path: '/', exact: true },
  { icon: Trophy, label: 'Leagues', path: '/leagues' },
  { icon: ChartLineUp, label: 'Overview', path: '/pro', exact: true },
  { icon: CalendarBlank, label: 'Sessions', path: '/pro/sessions' },
  { icon: HandCoins, label: 'Settlements', path: '/pro/settlements' },
  { icon: FileText, label: 'Reports', path: '/pro/exports' },
]

const mobileNavItems = [
  { icon: House, label: 'Home', path: '/', exact: true },
  { icon: Trophy, label: 'Leagues', path: '/leagues' },
  { icon: CalendarBlank, label: 'Sessions', path: '/pro/sessions' },
  { icon: HandCoins, label: 'Settlements', path: '/pro/settlements' },
]

const moreNavItems = [
  { icon: ChartLineUp, label: 'Overview', path: '/pro', exact: true },
  { icon: GameController, label: 'Games', path: '/games' },
  { icon: FileText, label: 'Reports', path: '/pro/exports' },
  { icon: Wallet, label: 'Bankroll', path: '/pro/bankroll' },
  { icon: CalendarBlank, label: 'Calendar', path: '/pro/calendar' },
  { icon: AirplaneTilt, label: 'Travel', path: '/pro/travel' },
  { icon: Coins, label: 'Staking', path: '/pro/staking' },
  { icon: BookOpen, label: 'Study', path: '/pro/study' },
  { icon: ArrowsClockwise, label: 'Reconciliation', path: '/pro/reconciliation' },
]

function itemIsActive(pathname: string, path: string, exact?: boolean) {
  if (exact) return pathname === path
  return pathname === path || pathname.startsWith(`${path}/`)
}

export function AppLayout() {
  const signOut = useAuthStore((state) => state.signOut)
  const navigate = useNavigate()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const moreIsActive = moreNavItems.some((item) =>
    itemIsActive(location.pathname, item.path, item.exact),
  )

  return (
    <div className="flex min-h-screen w-full min-w-0 max-w-full flex-col overflow-x-clip bg-bg">
      <a
        href="#main-content"
        className="nav-link fixed left-3 top-3 z-[60] -translate-y-24 rounded-sm border border-gold-leaf bg-felt-deep px-4 py-2 font-semibold text-ivory focus:translate-y-0"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-gold-leaf/50 bg-felt text-ivory">
        <div className="mx-auto flex min-h-16 w-full max-w-[90rem] items-center gap-4 px-3 sm:px-5 lg:px-6">
          <BrandLockup inverse compact className="shrink-0 lg:min-w-52" />

          <nav
            className="ml-auto hidden min-w-0 items-stretch self-stretch lg:flex"
            aria-label="Primary navigation"
          >
            {desktopNavItems.map((item) => {
              const active = itemIsActive(location.pathname, item.path, item.exact)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'nav-link relative flex min-h-12 items-center gap-1.5 border-x border-transparent px-2.5 text-sm font-medium text-ivory/80 hover:bg-ivory/8 hover:text-white xl:px-3',
                    active &&
                      'border-gold-leaf/20 bg-felt-deep text-gold-leaf after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-gold-leaf',
                  )}
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="hidden min-h-11 shrink-0 items-center gap-2 rounded-sm border border-ivory/20 px-3 text-sm font-medium text-ivory/80 hover:border-gold-leaf hover:text-white lg:flex"
          >
            <SignOut className="size-4" aria-hidden="true" />
            <span className="hidden xl:inline">Sign out</span>
          </button>

        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full min-w-0 max-w-[90rem] flex-1 px-3 pb-28 pt-5 outline-none sm:px-5 sm:pb-28 sm:pt-7 lg:px-6 lg:pb-8"
      >
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 w-auto min-w-0 overflow-x-clip border-t border-gold-leaf/50 bg-felt pb-[env(safe-area-inset-bottom)] text-ivory lg:hidden"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto grid w-full min-w-0 max-w-2xl grid-cols-5">
          {mobileNavItems.map((item) => {
            const active = itemIsActive(location.pathname, item.path, item.exact)
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'nav-link flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 border-t-2 border-transparent px-0.5 text-[0.64rem] font-medium text-ivory/75 min-[360px]:text-[0.7rem]',
                  active && 'border-gold-leaf bg-felt-deep text-gold-leaf',
                )}
              >
                <item.icon className="size-5" aria-hidden="true" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className={cn(
              'flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 border-t-2 border-transparent px-0.5 text-[0.64rem] font-medium text-ivory/75 min-[360px]:text-[0.7rem]',
              moreIsActive && 'border-gold-leaf bg-felt-deep text-gold-leaf',
            )}
          >
            <DotsThree className="size-5" weight="bold" aria-hidden="true" />
            <span className="max-w-full truncate">More</span>
          </button>
        </div>
      </nav>

      <Modal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="More"
        className="sm:max-w-4xl"
      >
        <nav
          aria-label="More navigation"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
        >
          {moreNavItems.map((item) => {
            const active = itemIsActive(location.pathname, item.path, item.exact)
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'nav-link flex min-h-16 min-w-0 items-center gap-2 rounded-sm border border-rule-strong bg-ivory p-3 text-base font-semibold text-ink hover:border-gold hover:bg-bg',
                  active && 'border-felt bg-felt text-ivory',
                )}
              >
                <item.icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">{item.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex min-h-16 min-w-0 items-center gap-2 rounded-sm border border-rule-strong bg-ivory p-3 text-left text-base font-semibold text-danger hover:border-danger hover:bg-danger/5"
          >
            <SignOut className="size-5 shrink-0" aria-hidden="true" />
            Sign out
          </button>
        </nav>
      </Modal>
    </div>
  )
}
