import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Target, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { Link, useParams } from 'react-router'
import {
  PointsPerformance,
  ProfitPerformance,
  type PointsHistoryEntry,
  type ProfitHistoryEntry,
} from '../../components/player/PerformanceHistory'
import { Card } from '../../components/ui/Card'
import { formatMoney, money } from '../../lib/money'
import { supabase } from '../../lib/supabase'
import { formatDate, getInitials } from '../../lib/utils'
import type { GameResult, Player } from '../../types'
import {
  resultNetMinor,
  sortProfileResults,
  summarizeProfileMoney,
  trustedMinor,
  type ProfileResult,
} from './playerProfileCalculations'

interface ProfileStats {
  gamesPlayed: number
  totalPoints: number
  winRate: number
  averageFinish: number
  bestFinish: number
  wins: number
}

export function PlayerProfilePage() {
  const { leagueId = '', playerId = '' } = useParams<{
    leagueId: string
    playerId: string
  }>()
  const [player, setPlayer] = useState<Player | null>(null)
  const [results, setResults] = useState<ProfileResult[]>([])
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState<string | null>(null)

  const loadPlayerData = useCallback(async () => {
    if (!leagueId || !playerId) return
    setLoading(true)
    setFailure(null)

    try {
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .eq('league_id', leagueId)
        .single()
      if (playerError) throw playerError
      setPlayer(playerData)

      const { data: completedGames, error: gamesError } = await supabase
        .from('games')
        .select('id, scheduled_date, currency')
        .eq('league_id', leagueId)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: true })
      if (gamesError) throw gamesError

      const gameById = new Map(
        (completedGames ?? []).map((game) => [
          game.id,
          {
            date: game.scheduled_date,
            currency: game.currency ?? 'USD',
          },
        ]),
      )
      if (gameById.size === 0) {
        setResults([])
        return
      }

      const { data: resultData, error: resultsError } = await supabase
        .from('game_results')
        .select('*')
        .eq('player_id', playerId)
        .in('game_id', [...gameById.keys()])
        .order('created_at', { ascending: true })
      if (resultsError) throw resultsError

      setResults(
        sortProfileResults(
          ((resultData ?? []) as GameResult[]).map((result) => ({
            ...result,
            gameDate: gameById.get(result.game_id)?.date ?? result.created_at,
            currency: gameById.get(result.game_id)?.currency ?? 'USD',
          })),
        ),
      )
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Player data could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [leagueId, playerId])

  useEffect(() => {
    void loadPlayerData()
  }, [loadPlayerData])

  const trustedResults = useMemo(
    () =>
      results.filter(
        (result) =>
          trustedMinor(result, 'total_buy_in_minor') !== null &&
          trustedMinor(result, 'payout_minor') !== null,
      ),
    [results],
  )
  const moneySummary = useMemo(() => summarizeProfileMoney(trustedResults), [trustedResults])
  const stats = useMemo<ProfileStats | null>(() => {
    if (!player) return null
    const gamesPlayed = results.length
    const totalPoints = results.reduce(
      (sum, result) => sum + Number(result.points_earned),
      0,
    )
    const positions = results.map((result) => result.finish_position)
    const wins = positions.filter((position) => position === 1).length

    return {
      gamesPlayed,
      totalPoints,
      winRate: gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0,
      averageFinish:
        positions.length > 0
          ? positions.reduce((sum, position) => sum + position, 0) / positions.length
          : 0,
      bestFinish: positions.length > 0 ? Math.min(...positions) : 0,
      wins,
    }
  }, [player, results])

  const pointsHistory = useMemo<PointsHistoryEntry[]>(() => {
    let cumulative = 0
    return results.map((result) => {
      const points = Number(result.points_earned)
      cumulative += points
      return { date: formatDate(result.gameDate), points, cumulative }
    })
  }, [results])

  const profitHistory = useMemo<ProfitHistoryEntry[]>(
    () =>
      trustedResults.flatMap((result) => {
        const net = resultNetMinor(result)
        return net === null
          ? []
          : [{ date: formatDate(result.gameDate), profitMinor: net.toString() }]
      }),
    [trustedResults],
  )

  if (loading) {
    return (
      <div className="py-12 text-center text-muted" role="status">
        <h1 className="sr-only">Player profile</h1>
        Loading player…
      </div>
    )
  }
  if (failure) {
    return (
      <Card className="border-danger/30 text-danger" role="alert">
        <h1 className="sr-only">Player profile could not be loaded</h1>
        {failure}
      </Card>
    )
  }
  if (!player) {
    return (
      <div className="py-12 text-center text-muted">
        <h1 className="sr-only">Player profile</h1>
        Player not found.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Link
        to={`/leagues/${leagueId}`}
        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-poker-green underline-offset-4 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to league
      </Link>

      <Card className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm bg-felt font-serif text-lg font-bold text-ivory">
          {getInitials(player.display_name)}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
            Player profile
          </p>
          <h1 className="font-serif text-3xl font-semibold text-ink">{player.display_name}</h1>
          {stats && (
            <p className="mt-1 text-sm text-muted">
              <span className="tnum">{stats.gamesPlayed}</span> games recorded
            </p>
          )}
        </div>
      </Card>

      {stats && (
        <section aria-labelledby="career-statistics-title">
          <h2 id="career-statistics-title" className="sr-only">
            Career statistics
          </h2>
          <div className="grid grid-cols-2 gap-px border border-rule bg-rule md:grid-cols-3">
            <Stat
              label="Total points"
              value={stats.totalPoints.toLocaleString()}
              icon={Trophy}
            />
            <Stat
              label="Net profit"
              value={
                moneySummary.currency && moneySummary.netMinor !== null
                  ? formatMoney(money(moneySummary.netMinor.toString(), moneySummary.currency))
                  : 'Unavailable'
              }
              icon={
                moneySummary.netMinor !== null && moneySummary.netMinor < 0n
                  ? TrendingDown
                  : TrendingUp
              }
              tone={
                moneySummary.netMinor === null
                  ? 'default'
                  : moneySummary.netMinor >= 0n
                    ? 'profit'
                    : 'loss'
              }
            />
            <Stat label="Wins" value={String(stats.wins)} icon={Trophy} />
            <Stat
              label="Win rate"
              value={`${stats.winRate.toFixed(0)}%`}
              icon={Target}
            />
            <Stat
              label="Average finish"
              value={stats.averageFinish.toFixed(1)}
              icon={Target}
            />
            <Stat label="Best finish" value={String(stats.bestFinish || '—')} icon={Trophy} />
          </div>
          {trustedResults.length !== results.length && (
            <p className="mt-2 text-sm text-muted">
              Money statistics exclude {results.length - trustedResults.length} legacy result
              {results.length - trustedResults.length === 1 ? '' : 's'} without verified minor-unit
              totals.
            </p>
          )}
          {moneySummary.mixedCurrencies && (
            <p className="mt-2 text-sm text-muted">
              Money totals and profit history are unavailable across mixed currencies. Per-game
              amounts remain listed below.
            </p>
          )}
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <PointsPerformance history={pointsHistory} />
        {moneySummary.currency ? (
          <ProfitPerformance history={profitHistory} currency={moneySummary.currency} />
        ) : (
          <section
            className="rounded-sm border border-rule bg-ivory p-5"
            aria-labelledby="profit-history-unavailable"
          >
            <h2
              id="profit-history-unavailable"
              className="font-serif text-lg font-semibold text-ink"
            >
              Profit history
            </h2>
            <p className="mt-2 text-sm text-muted">
              {moneySummary.mixedCurrencies
                ? 'Unavailable across mixed currencies. Per-game amounts are listed below.'
                : 'No verified minor-unit results are available.'}
            </p>
          </section>
        )}
      </div>

      {results.length > 0 && (
        <section aria-labelledby="game-history-title">
          <div className="mb-2 flex items-end justify-between gap-3">
            <h2 id="game-history-title" className="font-serif text-xl font-semibold text-ink">
              Game history
            </h2>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              {results.length} result{results.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="divide-y divide-rule border-y border-rule-strong">
            {results.map((result) => {
              const netMinor = resultNetMinor(result)
              return (
                <div
                  key={result.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 bg-ivory px-3 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gold text-sm font-bold text-gold tnum">
                    {result.finish_position}
                  </div>
                  <div>
                    <p className="font-medium text-ink">{formatDate(result.gameDate)}</p>
                    <p className="text-xs text-muted tnum">
                      {Number(result.points_earned).toLocaleString()} points
                    </p>
                  </div>
                  <p
                    className={`text-right font-semibold tnum ${
                      netMinor === null
                        ? 'text-muted'
                        : netMinor >= 0n
                          ? 'text-profit'
                          : 'text-loss'
                    }`}
                  >
                    {netMinor === null
                      ? 'Incomplete'
                      : formatMoney(money(netMinor.toString(), result.currency))}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string
  icon: typeof Trophy
  tone?: 'default' | 'profit' | 'loss'
}) {
  return (
    <div className="bg-ivory px-4 py-5">
      <Icon className="mb-3 h-4 w-4 text-gold" aria-hidden="true" />
      <p
        className={`font-serif text-2xl font-semibold tnum ${
          tone === 'profit'
            ? 'text-profit'
            : tone === 'loss'
              ? 'text-loss'
              : 'text-ink'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
    </div>
  )
}
