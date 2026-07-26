import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Calendar, CircleDot, MapPin, Spade } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { formatDate } from '../lib/utils'
import {
  gameDisplayName,
  gamePhaseLabel,
  getGameCategory,
  loadGamesForUser,
  type HomeGameListItem,
} from '../lib/homeGames'

type Filter = 'active' | 'past' | 'cancelled' | 'all'

export function GamesPage() {
  const { user } = useAuthStore()
  const [filter, setFilter] = useState<Filter>('active')
  const userId = user?.id ?? ''
  const query = useQuery({
    queryKey: ['home', 'games', userId],
    queryFn: () => loadGamesForUser(userId),
    enabled: Boolean(userId),
  })
  const grouped = useMemo(() => {
    const source = query.data ?? []
    return {
      live: source.filter((game) => getGameCategory(game) === 'live'),
      upcoming: source.filter((game) => getGameCategory(game) === 'upcoming'),
      past: source.filter((game) => getGameCategory(game) === 'past'),
      cancelled: source.filter((game) => getGameCategory(game) === 'cancelled'),
    }
  }, [query.data])

  if (query.isPending) return <div className="py-12 text-center text-muted">Loading games…</div>

  const sections =
    filter === 'active'
      ? [['Live', grouped.live], ['Upcoming', grouped.upcoming]]
      : filter === 'past'
        ? [['Past', grouped.past]]
        : filter === 'cancelled'
          ? [['Cancelled', grouped.cancelled]]
          : [
              ['Live', grouped.live],
              ['Upcoming', grouped.upcoming],
              ['Past', grouped.past],
              ['Cancelled', grouped.cancelled],
            ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-ink">Games</h1>
        <p className="mt-1 text-sm text-muted">Open a game to run registration, seating, money, and closeout.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Game filters">
        {(['active', 'past', 'cancelled', 'all'] as const).map((option) => (
          <button
            key={option}
            role="tab"
            aria-selected={filter === option}
            onClick={() => setFilter(option)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold capitalize ${
              filter === option ? 'bg-poker-green text-white' : 'border border-border bg-white text-muted'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {query.isError && (
        <Card className="border-danger/30 bg-danger/5 text-sm text-danger" role="alert">
          Could not load games. Refresh to try again.
        </Card>
      )}

      {sections.map(([label, items]) => {
        const games = items as HomeGameListItem[]
        return (
          <section key={label as string} aria-labelledby={`${String(label).toLowerCase()}-games`}>
            <h2 id={`${String(label).toLowerCase()}-games`} className="mb-3 flex items-center gap-2 text-lg font-semibold text-ink">
              {label === 'Live' ? <CircleDot className="h-5 w-5 text-success" /> : <Calendar className="h-5 w-5 text-gold" />}
              {label as string} ({games.length})
            </h2>
            {games.length === 0 ? (
              <Card><p className="py-4 text-center text-sm text-muted">No {String(label).toLowerCase()} games.</p></Card>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {games.map((game) => (
                  <Link key={game.id} to={`/leagues/${game.league_id}/games/${game.id}`}>
                    <Card className="h-full cursor-pointer transition-colors hover:border-gold/50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{game.league_name}</p>
                          <p className="mt-1 truncate text-lg font-semibold text-ink">
                            {gameDisplayName(game, game.league_name)}
                          </p>
                          <p className="mt-1 text-sm text-muted">{formatDate(game.scheduled_date)}</p>
                          {game.location && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                              <MapPin className="h-3 w-3" /> {game.location}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Badge variant={getGameCategory(game) === 'live' ? 'green' : 'gold'}>
                            {gamePhaseLabel(game.phase)}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs capitalize text-muted">
                            <Spade className="h-3 w-3" /> {game.kind}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
