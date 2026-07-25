import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, Trophy, Calendar, Users, Settings } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { formatCurrency, formatDate, getInitials } from '../../lib/utils'
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription'
import { AddPlayerModal } from '../../components/modals/AddPlayerModal'
import { ScheduleGameModal } from '../../components/modals/ScheduleGameModal'
import { CreateSeasonModal } from '../../components/modals/CreateSeasonModal'
import { LeagueSettings } from './LeagueSettings'
import type { League, Season, Player, Game, StandingEntry } from '../../types'

type Tab = 'standings' | 'games' | 'players' | 'settings'

export function LeagueDetailPage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const [league, setLeague] = useState<League | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [activeSeason, setActiveSeason] = useState<Season | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [standings, setStandings] = useState<StandingEntry[]>([])
  const [tab, setTab] = useState<Tab>('standings')
  const [loading, setLoading] = useState(true)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showScheduleGame, setShowScheduleGame] = useState(false)
  const [showCreateSeason, setShowCreateSeason] = useState(false)

  useRealtimeSubscription('game_results', undefined, () => {
    if (activeSeason) loadStandings(activeSeason.id, players)
  })

  useEffect(() => {
    if (!leagueId) return
    loadLeagueData()
  }, [leagueId])

  async function loadLeagueData() {
    const { data: leagueData } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId!)
      .single()
    setLeague(leagueData)

    const { data: seasonData } = await supabase
      .from('seasons')
      .select('*')
      .eq('league_id', leagueId!)
      .order('created_at', { ascending: false })
    setSeasons(seasonData ?? [])
    const active = seasonData?.find((s) => s.is_active) ?? seasonData?.[0] ?? null
    setActiveSeason(active)

    const { data: playerData } = await supabase
      .from('players')
      .select('*')
      .eq('league_id', leagueId!)
      .order('display_name')
    setPlayers(playerData ?? [])

    if (active) {
      const { data: gameData } = await supabase
        .from('games')
        .select('*')
        .eq('season_id', active.id)
        .order('scheduled_date', { ascending: false })
      setGames(gameData ?? [])

      await loadStandings(active.id, playerData ?? [])
    }

    setLoading(false)
  }

  async function loadStandings(seasonId: string, leaguePlayers: Player[]) {
    const { data: gameIds } = await supabase
      .from('games')
      .select('id')
      .eq('season_id', seasonId)
      .eq('status', 'completed')

    const ids = gameIds?.map((g) => g.id) ?? []
    if (ids.length === 0) {
      setStandings([])
      return
    }

    const { data: results } = await supabase
      .from('game_results')
      .select('*, players(display_name, avatar_url)')
      .in('game_id', ids)

    const playerMap = new Map<string, StandingEntry>()
    for (const p of leaguePlayers) {
      playerMap.set(p.id, {
        playerId: p.id,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        totalPoints: 0,
        gamesPlayed: 0,
        totalWinnings: 0,
        netProfit: 0,
        wins: 0,
        rank: 0,
      })
    }

    for (const r of results ?? []) {
      const entry = playerMap.get(r.player_id)
      if (!entry) continue
      entry.totalPoints += Number(r.points_earned)
      entry.gamesPlayed += 1
      entry.totalWinnings += Number(r.payout)
      entry.netProfit += Number(r.payout) - Number(r.buy_in_amount)
      if (r.finish_position === 1) entry.wins += 1
    }

    const sorted = Array.from(playerMap.values())
      .filter((e) => e.gamesPlayed > 0)
      .sort((a, b) => b.totalPoints - a.totalPoints)
    sorted.forEach((e, i) => (e.rank = i + 1))
    setStandings(sorted)
  }

  if (loading) return <div className="text-center text-gray-400 py-8">Loading...</div>
  if (!league) return <div className="text-center text-gray-400 py-8">League not found</div>

  const tabs: { key: Tab; label: string; icon: typeof Trophy }[] = [
    { key: 'standings', label: 'Standings', icon: Trophy },
    { key: 'games', label: 'Games', icon: Calendar },
    { key: 'players', label: 'Players', icon: Users },
    { key: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">{league.name}</h1>
        {league.description && <p className="text-base text-gray-400 mt-1">{league.description}</p>}
      </div>

      {/* Season selector */}
      <div className="flex items-center gap-2">
        {seasons.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {seasons.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSeason(s)
                  setTab('standings')
                }}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-base font-medium transition-colors ${
                  activeSeason?.id === s.id
                    ? 'bg-poker-green text-white'
                    : 'bg-card text-gray-400 hover:text-white'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        <Button size="sm" variant="secondary" onClick={() => setShowCreateSeason(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-base font-medium transition-colors ${
              tab === t.key
                ? 'border-gold text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <t.icon className="h-5 w-5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'standings' && (
        <div className="space-y-3">
          {standings.length === 0 ? (
            <Card><p className="text-center text-base text-gray-400 py-6">No completed games yet</p></Card>
          ) : (
            standings.map((s) => (
              <Link key={s.playerId} to={`/leagues/${leagueId}/players/${s.playerId}`}>
                <Card className="flex items-center gap-4 hover:border-gold/50 transition-colors cursor-pointer">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-lg font-bold text-gold">
                    {s.rank}
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-poker-green text-base font-semibold text-white">
                    {getInitials(s.displayName)}
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-white">{s.displayName}</p>
                    <p className="text-sm text-gray-400">{s.gamesPlayed} games · {s.wins} wins</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gold">{s.totalPoints} pts</p>
                    <p className={`text-sm font-medium ${s.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(s.netProfit)}
                    </p>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === 'games' && (
        <div className="space-y-3">
          <Button size="sm" className="mb-2" onClick={() => setShowScheduleGame(true)}>
            <Plus className="mr-1.5 h-5 w-5" />
            Schedule Game
          </Button>
          {games.length === 0 ? (
            <Card><p className="text-center text-base text-gray-400 py-6">No games yet</p></Card>
          ) : (
            games.map((g) => (
              <Link key={g.id} to={`/leagues/${leagueId}/games/${g.id}`}>
                <Card className="flex items-center justify-between hover:border-gold/50 transition-colors cursor-pointer">
                  <div>
                    <p className="text-lg font-semibold text-white">{formatDate(g.scheduled_date)}</p>
                    {g.location && <p className="text-sm text-gray-400 mt-0.5">{g.location}</p>}
                  </div>
                  <Badge variant={g.status === 'completed' ? 'green' : g.status === 'scheduled' ? 'gold' : 'default'}>
                    {g.status.replace('_', ' ')}
                  </Badge>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === 'players' && (
        <div className="space-y-3">
          <Button size="sm" className="mb-2" onClick={() => setShowAddPlayer(true)}>
            <Plus className="mr-1.5 h-5 w-5" />
            Add Player
          </Button>
          {players.length === 0 ? (
            <Card><p className="text-center text-base text-gray-400 py-6">No players yet</p></Card>
          ) : (
            players.map((p) => (
              <Link key={p.id} to={`/leagues/${leagueId}/players/${p.id}`}>
                <Card className="flex items-center gap-4 hover:border-gold/50 transition-colors cursor-pointer">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-poker-green text-base font-semibold text-white">
                    {getInitials(p.display_name)}
                  </div>
                  <p className="text-lg font-semibold text-white">{p.display_name}</p>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === 'settings' && (
        <LeagueSettings league={league} onUpdated={setLeague} />
      )}

      <AddPlayerModal
        open={showAddPlayer}
        onClose={() => setShowAddPlayer(false)}
        leagueId={leagueId!}
        onCreated={(p) => setPlayers((prev) => [...prev, p].sort((a, b) => a.display_name.localeCompare(b.display_name)))}
      />
      <ScheduleGameModal
        open={showScheduleGame}
        onClose={() => setShowScheduleGame(false)}
        leagueId={leagueId!}
        seasonId={activeSeason?.id ?? ''}
        players={players}
        onCreated={(g) => setGames((prev) => [g, ...prev])}
      />
      <CreateSeasonModal
        open={showCreateSeason}
        onClose={() => setShowCreateSeason(false)}
        leagueId={leagueId!}
        onCreated={(s) => {
          setSeasons((prev) => [s, ...prev])
          setActiveSeason(s)
        }}
      />
    </div>
  )
}
