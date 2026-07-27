import { Outlet } from 'react-router'
import { BrandLockup } from './BrandLockup'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-gold-leaf/50 bg-felt px-4 py-3">
        <div className="mx-auto w-full max-w-md">
          <BrandLockup to="/login" inverse />
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-8 outline-none sm:px-5"
      >
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
