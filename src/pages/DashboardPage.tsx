import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, CircleDollarSign, Plus, Scale, Trophy } from 'lucide-react'
import { CreateLeagueModal } from '../components/modals/CreateLeagueModal'
import {
  ActiveLeagueBrief,
  NextGameBrief,
  RecentResultsLedger,
  UnresolvedSettlementLedger,
} from '../components/dashboard/DashboardBriefing'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { SectionHeader } from '../components/ui/SectionHeader'
import { SummaryBand, type SummaryBandItem } from '../components/ui/SummaryBand'
import { Surface } from '../components/ui/Surface'
import { useAuthStore } from '../store/authStore'
import {
  getGameCategory,
  loadGamesForUser,
  loadLeaguesForUser,
} from '../lib/homeGames'
import {
  calculateCareerMetrics,
  listSettlements,
  loadDashboardData,
} from '../lib/pro'

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [showCreateLeague, setShowCreateLeague] = useState(false)
  const userId = user?.id ?? ''
  const leaguesQuery = useQuery({
    queryKey: ['home', 'leagues', userId],
    queryFn: () => loadLeaguesForUser(userId),
    enabled: Boolean(userId),
  })
  const gamesQuery = useQuery({
    queryKey: ['home', 'games', userId],
    queryFn: () => loadGamesForUser(userId),
    enabled: Boolean(userId),
  })
  const careerQuery = useQuery({
    queryKey: ['pro', 'dashboard', userId],
    queryFn: () => loadDashboardData(userId),
    enabled: Boolean(userId),
  })
  const settlementsQuery = useQuery({
    queryKey: ['pro', 'settlements', userId],
    queryFn: () => listSettlements(userId),
    enabled: Boolean(userId),
  })

  const leagues = leaguesQuery.data ?? []
  const games = gamesQuery.data ?? []
  const activeGames = games
    .filter((game) => ['live', 'upcoming'].includes(getGameCategory(game)))
    .sort((left, right) => left.scheduled_date.localeCompare(right.scheduled_date))
  const nextGame = activeGames[0] ?? null
  const activeLeague =
    leagues.find((league) => league.id === nextGame?.league_id) ?? leagues[0] ?? null
  const careerMetrics = careerQuery.data
    ? calculateCareerMetrics(careerQuery.data)
    : null
  const recentSessions = [...(careerQuery.data?.sessions ?? [])]
    .sort((left, right) => right.played_at.localeCompare(left.played_at))
    .slice(0, 5)
  const unresolvedSettlements = (settlementsQuery.data ?? []).filter(
    (settlement) => settlement.status !== 'paid' && settlement.status !== 'void',
  )
  const unresolvedTotalMinor = unresolvedSettlements
    .filter(
      (settlement) =>
        settlement.direction === 'payable' && settlement.currency === 'USD',
    )
    .reduce((sum, settlement) => sum + BigInt(settlement.amount_minor), 0n)
    .toString()

  const summaryItems: SummaryBandItem[] = []
  if (nextGame) {
    summaryItems.push({
      key: 'next-game',
      label: 'Next game',
      value: new Date(nextGame.scheduled_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      detail: nextGame.league_name,
      icon: <Calendar className="h-4 w-4" />,
    })
  }
  if (activeLeague) {
    summaryItems.push({
      key: 'active-league',
      label: 'Active league',
      value: activeLeague.name,
      detail: `${activeLeague.role} access`,
      icon: <Trophy className="h-4 w-4" />,
    })
  }
  if (careerMetrics && careerQuery.data?.accounts.length) {
    summaryItems.push({
      key: 'bankroll',
      label: 'Bankroll',
      value: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: careerMetrics.currency,
      }).format(Number(careerMetrics.bankrollMinor) / 100),
      detail:
        BigInt(careerMetrics.totalProfitMinor) === 0n
          ? undefined
          : `${BigInt(careerMetrics.totalProfitMinor) > 0n ? '+' : ''}${new Intl.NumberFormat(
              'en-US',
              {
                style: 'currency',
                currency: careerMetrics.currency,
              },
            ).format(Number(careerMetrics.totalProfitMinor) / 100)} recorded`,
      icon: <CircleDollarSign className="h-4 w-4" />,
      tone: BigInt(careerMetrics.bankrollMinor) < 0n ? 'loss' : 'profit',
    })
  }
  if (unresolvedSettlements.length > 0) {
    summaryItems.push({
      key: 'settlements',
      label: 'Unresolved',
      value: String(unresolvedSettlements.length),
      detail:
        unresolvedTotalMinor === '0'
          ? undefined
          : `${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(Number(unresolvedTotalMinor) / 100)} payable`,
      icon: <Scale className="h-4 w-4" />,
      tone: 'loss',
    })
  }

  const pending =
    leaguesQuery.isPending ||
    gamesQuery.isPending ||
    careerQuery.isPending ||
    settlementsQuery.isPending
  const hasError =
    leaguesQuery.isError ||
    gamesQuery.isError ||
    careerQuery.isError ||
    settlementsQuery.isError

  if (pending) {
    return (
      <div className="py-12 text-center text-muted" role="status">
        Loading Home…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        headingLevel={1}
        eyebrow="Daily briefing"
        title="Home"
        action={
          <Button size="md" className="gap-2" onClick={() => setShowCreateLeague(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New league
          </Button>
        }
      />

      {hasError && (
        <Surface tone="plain" padding="sm" role="alert">
          <p className="text-sm font-semibold text-danger">
            Some Home data could not be loaded. Reload to try again.
          </p>
        </Surface>
      )}

      {summaryItems.length > 0 && (
        <SummaryBand items={summaryItems} ariaLabel="Home summary" />
      )}

      {leagues.length === 0 ? (
        <Surface padding="lg">
          <EmptyState
            icon={<Trophy className="h-7 w-7" />}
            title="No leagues"
            description="Create a league to schedule a game."
            action={
              <Button onClick={() => setShowCreateLeague(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create league
              </Button>
            }
          />
        </Surface>
      ) : null}

      {nextGame && <NextGameBrief game={nextGame} />}
      {activeLeague && <ActiveLeagueBrief league={activeLeague} />}
      {(recentSessions.length > 0 || unresolvedSettlements.length > 0) && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
          {recentSessions.length > 0 && <RecentResultsLedger sessions={recentSessions} />}
          {unresolvedSettlements.length > 0 && (
            <UnresolvedSettlementLedger settlements={unresolvedSettlements} />
          )}
        </div>
      )}

      <CreateLeagueModal
        open={showCreateLeague}
        onClose={() => setShowCreateLeague(false)}
        onCreated={() => {
          void queryClient.invalidateQueries({ queryKey: ['home', 'leagues', userId] })
        }}
      />
    </div>
  )
}
