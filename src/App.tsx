import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { AppLayout } from './components/layout/AppLayout'
import { AuthLayout } from './components/layout/AuthLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { SignUpPage } from './pages/auth/SignUpPage'
import { DashboardPage } from './pages/DashboardPage'
import { LeaguesPage } from './pages/LeaguesPage'
import { GamesPage } from './pages/GamesPage'
import { LeagueDetailPage } from './pages/league/LeagueDetailPage'
import { GameDetailPage } from './pages/game/GameDetailPage'
import { PlayerProfilePage } from './pages/player/PlayerProfilePage'

function App() {
  const { initialized, initialize, user } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-gold text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
        </Route>

        {/* App routes (protected) */}
        <Route element={user ? <AppLayout /> : <Navigate to="/login" replace />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/leagues" element={<LeaguesPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/leagues/:leagueId" element={<LeagueDetailPage />} />
          <Route path="/leagues/:leagueId/games/:gameId" element={<GameDetailPage />} />
          <Route path="/leagues/:leagueId/players/:playerId" element={<PlayerProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
