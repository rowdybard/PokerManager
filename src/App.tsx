import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { useAuthStore } from './store/authStore'
import { AppLayout } from './components/layout/AppLayout'
import { AuthLayout } from './components/layout/AuthLayout'

const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const SignUpPage = lazy(() =>
  import('./pages/auth/SignUpPage').then((module) => ({ default: module.SignUpPage })),
)
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
)
const LeaguesPage = lazy(() =>
  import('./pages/LeaguesPage').then((module) => ({ default: module.LeaguesPage })),
)
const GamesPage = lazy(() =>
  import('./pages/GamesPage').then((module) => ({ default: module.GamesPage })),
)
const LeagueDetailPage = lazy(() =>
  import('./pages/league/LeagueDetailPage').then((module) => ({
    default: module.LeagueDetailPage,
  })),
)
const GameDetailPage = lazy(() =>
  import('./pages/game/GameDetailPage').then((module) => ({
    default: module.GameDetailPage,
  })),
)
const PlayerProfilePage = lazy(() =>
  import('./pages/player/PlayerProfilePage').then((module) => ({
    default: module.PlayerProfilePage,
  })),
)
const GuestInvitePage = lazy(() =>
  import('./pages/invite/GuestInvitePage').then((module) => ({
    default: module.GuestInvitePage,
  })),
)
const ProDashboardPage = lazy(() =>
  import('./pages/pro/ProDashboardPage').then((module) => ({
    default: module.ProDashboardPage,
  })),
)
const CareerSessionsPage = lazy(() =>
  import('./pages/pro/CareerSessionsPage').then((module) => ({
    default: module.CareerSessionsPage,
  })),
)
const BankrollPage = lazy(() =>
  import('./pages/pro/BankrollPage').then((module) => ({
    default: module.BankrollPage,
  })),
)
const SettlementsPage = lazy(() =>
  import('./pages/pro/SettlementsPage').then((module) => ({
    default: module.SettlementsPage,
  })),
)
const TravelExpensesPage = lazy(() =>
  import('./pages/pro/TravelExpensesPage').then((module) => ({
    default: module.TravelExpensesPage,
  })),
)
const StakingPage = lazy(() =>
  import('./pages/pro/StakingPage').then((module) => ({
    default: module.StakingPage,
  })),
)
const ProfessionalCalendarPage = lazy(() =>
  import('./pages/pro/ProfessionalCalendarPage').then((module) => ({
    default: module.ProfessionalCalendarPage,
  })),
)
const StudyPage = lazy(() =>
  import('./pages/pro/StudyPage').then((module) => ({
    default: module.StudyPage,
  })),
)
const ExportsPage = lazy(() =>
  import('./pages/pro/ExportsPage').then((module) => ({
    default: module.ExportsPage,
  })),
)
const ReconciliationPage = lazy(() =>
  import('./pages/pro/ReconciliationPage').then((module) => ({
    default: module.ReconciliationPage,
  })),
)

function LoadingScreen() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-bg"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 text-lg font-semibold text-poker-green">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-poker-green border-t-transparent" />
        Loading Poker Manager…
      </div>
    </div>
  )
}

function RouteLoading({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
}

function ProtectedLayout() {
  const { initialized, user } = useAuthStore()
  const location = useLocation()

  if (!initialized) return <LoadingScreen />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <AppLayout />
}

function AnonymousOnlyLayout() {
  const { initialized, user } = useAuthStore()
  if (!initialized) return <LoadingScreen />
  return user ? <Navigate to="/" replace /> : <AuthLayout />
}

function App() {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  return (
    <BrowserRouter>
      <RouteLoading>
        <Routes>
          <Route path="/i/:token" element={<GuestInvitePage />} />

          <Route element={<AnonymousOnlyLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
          </Route>

          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/leagues" element={<LeaguesPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/leagues/:leagueId" element={<LeagueDetailPage />} />
            <Route path="/leagues/:leagueId/games/:gameId" element={<GameDetailPage />} />
            <Route path="/leagues/:leagueId/players/:playerId" element={<PlayerProfilePage />} />
            <Route path="/pro" element={<ProDashboardPage />} />
            <Route path="/pro/sessions" element={<CareerSessionsPage />} />
            <Route path="/pro/bankroll" element={<BankrollPage />} />
            <Route path="/pro/settlements" element={<SettlementsPage />} />
            <Route path="/pro/travel" element={<TravelExpensesPage />} />
            <Route path="/pro/staking" element={<StakingPage />} />
            <Route path="/pro/calendar" element={<ProfessionalCalendarPage />} />
            <Route path="/pro/study" element={<StudyPage />} />
            <Route path="/pro/exports" element={<ExportsPage />} />
            <Route path="/pro/reconciliation" element={<ReconciliationPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RouteLoading>
    </BrowserRouter>
  )
}

export default App
