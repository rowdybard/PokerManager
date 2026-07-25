import { Outlet, Link } from 'react-router-dom'
import { Spade } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <Link to="/login" className="mb-8 flex items-center gap-2">
        <Spade className="h-8 w-8 text-gold" />
        <span className="text-2xl font-bold text-white">Poker Manager</span>
      </Link>
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  )
}
