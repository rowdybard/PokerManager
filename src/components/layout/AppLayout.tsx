import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Home, Trophy, Calendar, LogOut, Spade } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../lib/utils'

export function AppLayout() {
  const { signOut } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Trophy, label: 'Leagues', path: '/leagues' },
    { icon: Calendar, label: 'Games', path: '/games' },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Spade className="h-6 w-6 text-gold" />
            <span className="text-lg font-bold text-white">Poker Manager</span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-base text-gray-400 hover:text-white px-2 py-1"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-24">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1.5 py-3.5 text-sm font-medium transition-colors',
                  isActive ? 'text-gold' : 'text-gray-500 hover:text-gray-300'
                )}
              >
                <item.icon className="h-6 w-6" />
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
