import { Outlet, Link } from 'react-router-dom'
import { Spade } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <Link to="/login" className="mb-10 flex items-center gap-3">
        <Spade className="h-10 w-10 text-gold" />
        <span className="text-3xl font-bold text-white">Poker Manager</span>
      </Link>
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}
