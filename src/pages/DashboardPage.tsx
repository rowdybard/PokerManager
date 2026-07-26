import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import {
  Calendar,
  CircleDollarSign,
  Plus,
  ShieldCheck,
  Spade,
  Trophy,
  Users,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { formatDate } from '../lib/utils'
import { CreateLeagueModal } from '../components/modals/CreateLeagueModal'
import { MockDataSeeder } from '../components/MockDataSeeder'
import {
  gameDisplayName,
  gamePhaseLabel,
  getGameCategory,
  loadGamesForUser,
  loadLeaguesForUser,
} from '../lib/homeGames'

export function DashboardPage() {
  const { user } = useAuthStore()
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

  if (leaguesQuery.isPending || gamesQuery.isPending) {
    return <div className="py-12 text-center text-muted" role="status">Loading dashboard…</div>
  }

  const leagues = leaguesQuery.data ?? []
  const games = gamesQuery.data ?? []
  const activeGames = games
    .filter((game) => ['live', 'upcoming'].includes(getGameCategory(game)))
    .sort((left, right) => left.scheduled_date.localeCompare(right.scheduled_date))
    .slice(0, 5)
  const canHost = leagues.some((league) => league.role === 'owner' || league.role === 'admin')

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">Home games</p>
          <h1 className="text-3xl font-bold text-ink">Host dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Invitations, game-night operations, results, and reconciliation in one place.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreateLeague(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New league
        </Button>
      </div>

      {(leaguesQuery.isError || gamesQuery.isError) && (
        <Card className="border-danger/30 bg-danger/5 text-sm text-danger" role="alert">
          Some home-game data could not be loaded. Refresh to try again.
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Trophy} label="Leagues" value={String(leagues.length)} />
        <Metric
          icon={Calendar}
          label="Upcoming"
          value={String(games.filter((game) => getGameCategory(game) === 'upcoming').length)}
        />
        <Metric
          icon={Spade}
          label="Running now"
          value={String(games.filter((game) => getGameCategory(game) === 'live').length)}
        />
        <Metric
          icon={ShieldCheck}
          label="Host access"
          value={canHost ? 'Ready' : 'Member'}
        />
      </div>

      <section aria-labelledby="next-games-title">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="next-games-title" className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Calendar className="h-5 w-5 text-gold" />
            Next games
          </h2>
          <Link to="/games" className="text-sm font-medium text-poker-green hover:underline">
            View all
          </Link>
        </div>
        {activeGames.length === 0 ? (
          <Card>
            <div className="py-5 text-center">
              <CircleDollarSign className="mx-auto mb-2 h-8 w-8 text-border" />
              <p className="text-sm text-muted">No live or upcoming games.</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {activeGames.map((game) => (
              <Link key={game.id} to={`/leagues/${game.league_id}/games/${game.id}`}>
                <Card className="h-full cursor-pointer transition-colors hover:border-gold/50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {game.league_name}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-ink">
                        {gameDisplayName(game, game.league_name)}
                      </p>
                      <p className="mt-1 text-sm text-muted">{formatDate(game.scheduled_date)}</p>
                      {game.location && <p className="mt-1 text-xs text-muted">{game.location}</p>}
                    </div>
                    <Badge variant={getGameCategory(game) === 'live' ? 'green' : 'gold'}>
                      {gamePhaseLabel(game.phase)}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="leagues-title">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="leagues-title" className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Users className="h-5 w-5 text-gold" />
            Your leagues
          </h2>
          <Link to="/leagues" className="text-sm font-medium text-poker-green hover:underline">
            Manage
          </Link>
        </div>
        {leagues.length === 0 ? (
          <Card>
            <div className="py-7 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-border" />
              <p className="mb-4 text-sm text-muted">Create a league to run your first game.</p>
              <Button size="sm" onClick={() => setShowCreateLeague(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Create league
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {leagues.map((league) => (
              <Link key={league.id} to={`/leagues/${league.id}`}>
                <Card className="h-full cursor-pointer transition-colors hover:border-gold/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-poker-green">
                      <Trophy className="h-5 w-5 text-gold-light" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{league.name}</p>
                      <p className="capitalize text-xs text-muted">{league.role} access</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <CreateLeagueModal
        open={showCreateLeague}
        onClose={() => setShowCreateLeague(false)}
        onCreated={() => {
          void queryClient.invalidateQueries({ queryKey: ['home', 'leagues', userId] })
        }}
      />

      {import.meta.env.DEV ? <MockDataSeeder /> : null}
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy
  label: string
  value: string
}) {
  return (
    <Card className="flex items-center gap-3">
      <div className="rounded-lg bg-cream p-2.5">
        <Icon className="h-5 w-5 text-poker-green" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <p className="text-xl font-bold text-ink">{value}</p>
      </div>
    </Card>
  )
}
