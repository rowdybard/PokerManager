import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown, Trophy, Target } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { formatCurrency, formatDate, getInitials } from '../../lib/utils'
import type { Player, GameResult, Game, PlayerStats } from '../../types'

export function PlayerProfilePage() {
  const { leagueId, playerId } = useParams<{ leagueId: string; playerId: string }>()
  const [player, setPlayer] = useState<Player | null>(null)
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [results, setResults] = useState<(GameResult & { games?: Game })[]>([])
  const [pointsHistory, setPointsHistory] = useState<{ game: string; points: number; cumulative: number }[]>([])
  const [winningsHistory, setWinningsHistory] = useState<{ game: string; profit: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!playerId) return
    loadPlayerData()
  }, [playerId])

  async function loadPlayerData() {
    const { data: playerData } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId!)
      .single()
    setPlayer(playerData)

    const { data: gameIds } = await supabase
      .from('games')
      .select('id, scheduled_date')
      .eq('league_id', leagueId!)
      .eq('status', 'completed')

    const completedGames = gameIds ?? []
    const ids = completedGames.map((g) => g.id)

    if (ids.length === 0) {
      setLoading(false)
      return
    }

    const { data: resultData } = await supabase
      .from('game_results')
      .select('*')
      .eq('player_id', playerId!)
      .in('game_id', ids)
      .order('created_at', { ascending: true })

    const playerResults = resultData ?? []
    setResults(playerResults as (GameResult & { games?: Game })[])

    // Calculate stats
    const gamesPlayed = playerResults.length
    const totalPoints = playerResults.reduce((sum, r) => sum + Number(r.points_earned), 0)
    const totalWinnings = playerResults.reduce((sum, r) => sum + Number(r.payout), 0)
    const totalBuyIns = playerResults.reduce((sum, r) => sum + Number(r.buy_in_amount), 0)
    const wins = playerResults.filter((r) => r.finish_position === 1).length
    const positions = playerResults.map((r) => r.finish_position)
    const averageFinish = positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : 0
    const bestFinish = positions.length > 0 ? Math.min(...positions) : 0
    const podiumFinishes = positions.filter((p) => p <= 3).length

    setStats({
      playerId: playerId!,
      displayName: playerData?.display_name ?? '',
      avatarUrl: playerData?.avatar_url ?? null,
      gamesPlayed,
      totalPoints,
      totalWinnings,
      totalBuyIns,
      netProfit: totalWinnings - totalBuyIns,
      winRate: gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0,
      averageFinish,
      bestFinish,
      podiumFinishes,
      wins,
    })

    // Build chart data
    const gameDateMap = new Map(completedGames.map((g) => [g.id, g.scheduled_date]))
    let cumulative = 0
    const pHistory: { game: string; points: number; cumulative: number }[] = []
    const wHistory: { game: string; profit: number }[] = []

    for (const r of playerResults) {
      const date = gameDateMap.get(r.game_id) ?? ''
      cumulative += Number(r.points_earned)
      pHistory.push({ game: formatDate(date), points: Number(r.points_earned), cumulative })
      wHistory.push({ game: formatDate(date), profit: Number(r.payout) - Number(r.buy_in_amount) })
    }

    setPointsHistory(pHistory)
    setWinningsHistory(wHistory)

    setLoading(false)
  }

  if (loading) return <div className="text-center text-muted py-12">Loading...</div>
  if (!player) return <div className="text-center text-muted py-12">Player not found</div>

  return (
    <div className="space-y-4">
      <Link to={`/leagues/${leagueId}`} className="flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Back to league
      </Link>

      {/* Player header */}
      <Card className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-poker-green text-lg font-bold text-white">
          {getInitials(player.display_name)}
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink">{player.display_name}</h1>
          {stats && <p className="text-sm text-muted">{stats.gamesPlayed} games played</p>}
        </div>
      </Card>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Total Points" value={String(stats.totalPoints)} icon={Trophy} color="text-gold" />
          <StatCard
            label="Net Profit"
            value={formatCurrency(stats.netProfit)}
            icon={stats.netProfit >= 0 ? TrendingUp : TrendingDown}
            color={stats.netProfit >= 0 ? 'text-success' : 'text-danger'}
          />
          <StatCard label="Wins" value={String(stats.wins)} icon={Trophy} color="text-ink" />
          <StatCard label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} icon={Target} color="text-ink" />
          <StatCard label="Avg Finish" value={stats.averageFinish.toFixed(1)} icon={Target} color="text-ink" />
          <StatCard label="Best Finish" value={String(stats.bestFinish)} icon={Trophy} color="text-gold" />
        </div>
      )}

      {/* Points over time chart */}
      {pointsHistory.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Points Over Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={pointsHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd0" />
                <XAxis dataKey="game" tick={{ fill: '#8a8578', fontSize: 10 }} />
                <YAxis tick={{ fill: '#8a8578', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2ddd0', borderRadius: '8px' }}
                  labelStyle={{ color: '#8a8578' }}
                />
                <Line type="monotone" dataKey="cumulative" stroke="#b8941f" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Winnings chart */}
      {winningsHistory.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Profit/Loss per Game</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={winningsHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2ddd0" />
                <XAxis dataKey="game" tick={{ fill: '#8a8578', fontSize: 10 }} />
                <YAxis tick={{ fill: '#8a8578', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2ddd0', borderRadius: '8px' }}
                  labelStyle={{ color: '#8a8578' }}
                />
                <Bar dataKey="profit" fill="#1a6b4c" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Game history */}
      {results.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold text-ink">Game History</h2>
          <div className="space-y-2">
            {results.map((r) => (
              <Card key={r.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cream text-sm font-bold text-gold">
                    {r.finish_position}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{formatDate(r.games?.scheduled_date ?? r.created_at)}</p>
                    <p className="text-xs text-muted">{r.points_earned} pts</p>
                  </div>
                </div>
                <p className={`text-sm font-medium ${Number(r.payout) - Number(r.buy_in_amount) >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(Number(r.payout) - Number(r.buy_in_amount))}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof Trophy; color: string }) {
  return (
    <Card className="flex flex-col items-center justify-center py-4">
      <Icon className={`mb-1.5 h-5 w-5 ${color}`} />
      <p className="text-lg font-bold text-ink">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </Card>
  )
}
