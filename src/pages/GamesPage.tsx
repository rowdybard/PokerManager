import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Calendar, CircleDot, MapPin, Spade } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'
import { formatDate } from '../lib/utils'
import {
  gameDisplayName,
  gamePhaseLabel,
  getGameCategory,
  loadGamesForUser,
  type HomeGameListItem,
} from '../lib/homeGames'

type Filter = 'active' | 'past' | 'cancelled' | 'all'

const filters: Filter[] = ['active', 'past', 'cancelled', 'all']

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

  if (query.isPending) {
    return (
      <div className="py-12 text-center text-muted" role="status">
        Loading games…
      </div>
    )
  }

  const sections: Array<[string, HomeGameListItem[]]> =
    filter === 'active'
      ? [
          ['Live', grouped.live],
          ['Upcoming', grouped.upcoming],
        ]
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
      <SectionHeader headingLevel={1} title="Games" className="pb-4" />

      <div className="flex flex-wrap gap-2" aria-label="Game filters">
        {filters.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
            className={`min-h-11 min-w-16 border px-3 py-2 text-sm font-semibold capitalize ${
              filter === option
                ? 'border-felt bg-felt text-white'
                : 'border-rule-strong bg-ivory text-ink hover:bg-cream'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {query.isError ? (
        <div
          className="flex flex-col gap-3 border-l-4 border-danger bg-danger/5 p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <span>Could not load games.</span>
          <Button
            size="sm"
            variant="secondary"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching ? 'Retrying…' : 'Retry'}
          </Button>
        </div>
      ) : null}

      {sections.map(([label, games]) => {
        const headingId = `${label.toLowerCase()}-games`
        return (
          <section
            key={label}
            aria-labelledby={headingId}
            className="border border-rule bg-ivory"
          >
            <div className="flex min-h-12 items-center justify-between border-b border-rule px-4 py-2">
              <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold text-ink">
                {label === 'Live' ? (
                  <CircleDot className="h-4 w-4 text-success" aria-hidden="true" />
                ) : (
                  <Calendar className="h-4 w-4 text-gold" aria-hidden="true" />
                )}
                {label}
              </h2>
              <span className="tnum text-sm text-muted" aria-label={`${games.length} games`}>
                {games.length}
              </span>
            </div>
            {games.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">
                No {label.toLowerCase()} games.
              </p>
            ) : (
              <ul className="divide-y divide-rule">
                {games.map((game) => (
                  <li key={game.id}>
                    <Link
                      to={`/leagues/${game.league_id}/games/${game.id}`}
                      className="grid min-h-20 gap-3 px-4 py-3 hover:bg-cream sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          {game.league_name}
                        </p>
                        <p className="mt-1 truncate text-lg font-semibold text-ink">
                          {gameDisplayName(game, game.league_name)}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
                          <span>{formatDate(game.scheduled_date)}</span>
                          {game.location ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                              {game.location}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className="flex items-center gap-1 text-xs capitalize text-muted">
                          <Spade className="h-3.5 w-3.5" aria-hidden="true" />
                          {game.kind}
                        </span>
                        <Badge variant={getGameCategory(game) === 'live' ? 'green' : 'gold'}>
                          {gamePhaseLabel(game.phase)}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
