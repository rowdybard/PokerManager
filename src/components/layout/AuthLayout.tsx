import { Outlet, Link } from 'react-router'
import { Spade } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-5">
      <Link to="/login" className="mb-10 flex items-center gap-2.5">
        <Spade className="h-9 w-9 text-gold" />
        <span className="text-2xl font-bold text-ink">Poker Manager</span>
      </Link>
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  )
}
