import { Outlet, useLocation, useNavigate } from 'react-router'
import {
  CalendarDays,
  Home,
  LogOut,
  Spade,
  Trophy,
  UserRound,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../lib/utils'

const navItems = [
  { icon: Home, label: 'Home', path: '/', matches: ['/'] },
  { icon: Trophy, label: 'Leagues', path: '/leagues', matches: ['/leagues'] },
  { icon: CalendarDays, label: 'Games', path: '/games', matches: ['/games'] },
  { icon: UserRound, label: 'My Poker', path: '/pro', matches: ['/pro'] },
]

function itemIsActive(pathname: string, matches: string[]) {
  return matches.some((match) =>
    match === '/' ? pathname === '/' : pathname === match || pathname.startsWith(`${match}/`),
  )
}

export function AppLayout() {
  const signOut = useAuthStore((state) => state.signOut)
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-50 -translate-y-20 rounded-lg bg-ink px-4 py-2 font-semibold text-white transition focus:translate-y-0"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label="Poker Manager home"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-poker-green text-white">
              <Spade className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-xl font-bold text-ink">Poker Manager</span>
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition hover:bg-cream hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-border px-4 py-8 lg:block">
          <p className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">
            Home games
          </p>
          <nav className="mt-3 space-y-1" aria-label="Primary navigation">
            {navItems.slice(0, 3).map((item) => {
              const active = itemIsActive(location.pathname, item.matches)
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
                    active
                      ? 'bg-poker-green text-white shadow-sm'
                      : 'text-ink hover:bg-white',
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="my-6 border-t border-border" />
          <p className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">
            Private
          </p>
          <nav className="mt-3" aria-label="Private career navigation">
            {navItems.slice(3).map((item) => {
              const active = itemIsActive(location.pathname, item.matches)
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
                    active
                      ? 'bg-ink text-white shadow-sm'
                      : 'text-ink hover:bg-white',
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  {item.label}
                </button>
              )
            })}
          </nav>
          <p className="mt-3 px-3 text-xs leading-relaxed text-muted">
            Career, bankroll, staking, schedule, and study data are visible only to you.
          </p>
        </aside>

        <main
          id="main-content"
          className="min-w-0 flex-1 px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-10 lg:pb-10"
        >
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto grid max-w-xl grid-cols-4">
          {navItems.map((item) => {
            const active = itemIsActive(location.pathname, item.matches)
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[0.7rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold',
                  active ? 'text-poker-green' : 'text-muted hover:text-ink',
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
