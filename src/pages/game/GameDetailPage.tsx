import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { formatCurrency, formatDateTime, getInitials } from '../../lib/utils'
import { calculatePoints } from '../../lib/points'
import type { Game, GameResult, Player, GameInvite, League, PointsSystem } from '../../types'

export function GameDetailPage() {
  const { leagueId, gameId } = useParams<{ leagueId: string; gameId: string }>()
  const [game, setGame] = useState<Game | null>(null)
  const [results, setResults] = useState<GameResult[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [invites, setInvites] = useState<GameInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddResult, setShowAddResult] = useState(false)
  const [league, setLeague] = useState<League | null>(null)
  const [newResult, setNewResult] = useState({
    player_id: '',
    finish_position: 1,
    buy_in_amount: 0,
    payout: 0,
    rebuys: 0,
  })

  useEffect(() => {
    if (!gameId) return
    loadGameData()
  }, [gameId])

  async function loadGameData() {
    const { data: gameData } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId!)
      .single()
    setGame(gameData)

    const { data: leagueData } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId!)
      .single()
    setLeague(leagueData)

    const { data: playerData } = await supabase
      .from('players')
      .select('*')
      .eq('league_id', leagueId!)
      .order('display_name')
    setPlayers(playerData ?? [])

    const { data: resultData } = await supabase
      .from('game_results')
      .select('*')
      .eq('game_id', gameId!)
      .order('finish_position')
    setResults(resultData ?? [])

    const { data: inviteData } = await supabase
      .from('game_invites')
      .select('*')
      .eq('game_id', gameId!)
    setInvites(inviteData ?? [])

    setLoading(false)
  }

  async function addResult() {
    if (!newResult.player_id || !gameId || !league) return
    const totalPlayers = results.length + 1
    const points = calculatePoints(newResult.finish_position, totalPlayers, league.points_system as PointsSystem)
    await supabase.from('game_results').insert({
      game_id: gameId,
      player_id: newResult.player_id,
      finish_position: newResult.finish_position,
      buy_in_amount: newResult.buy_in_amount,
      payout: newResult.payout,
      rebuys: newResult.rebuys,
      points_earned: points,
    })
    setNewResult({ player_id: '', finish_position: 1, buy_in_amount: 0, payout: 0, rebuys: 0 })
    setShowAddResult(false)
    loadGameData()
  }

  async function deleteResult(id: string) {
    await supabase.from('game_results').delete().eq('id', id)
    loadGameData()
  }

  async function updateGameStatus(status: Game['status']) {
    if (!gameId) return
    await supabase.from('games').update({ status }).eq('id', gameId)
    setGame({ ...game!,status })
  }

  if (loading) return <div className="text-center text-gray-400 py-8">Loading...</div>
  if (!game) return <div className="text-center text-gray-400 py-8">Game not found</div>

  const rsvpCounts = {
    confirmed: invites.filter((i) => i.rsvp_status === 'confirmed').length,
    declined: invites.filter((i) => i.rsvp_status === 'declined').length,
    maybe: invites.filter((i) => i.rsvp_status === 'maybe').length,
    pending: invites.filter((i) => i.rsvp_status === 'pending').length,
  }

  return (
    <div className="space-y-4">
      <Link to={`/leagues/${leagueId}`} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Back to league
      </Link>

      {/* Game info */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{formatDateTime(game.scheduled_date)}</h1>
            {game.location && <p className="text-sm text-gray-400 mt-1">{game.location}</p>}
            {game.notes && <p className="text-sm text-gray-400 mt-1">{game.notes}</p>}
            <p className="text-sm text-gray-400 mt-1">Buy-in: {formatCurrency(Number(game.buy_in))}</p>
          </div>
          <Badge variant={game.status === 'completed' ? 'green' : game.status === 'scheduled' ? 'gold' : 'default'}>
            {game.status.replace('_', ' ')}
          </Badge>
        </div>
        {game.status !== 'completed' && (
          <Button size="sm" className="mt-3" onClick={() => updateGameStatus('completed')}>
            <Save className="mr-1 h-4 w-4" />
            Mark Complete
          </Button>
        )}
      </Card>

      {/* RSVP summary */}
      {invites.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">RSVPs</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-3 text-sm">
              <span className="text-green-400">{rsvpCounts.confirmed} confirmed</span>
              <span className="text-yellow-400">{rsvpCounts.maybe} maybe</span>
              <span className="text-red-400">{rsvpCounts.declined} declined</span>
              <span className="text-gray-400">{rsvpCounts.pending} pending</span>
            </div>
            <div className="space-y-1.5">
              {invites.map((invite) => {
                const player = players.find((p) => p.id === invite.player_id)
                if (!player) return null
                const colors: Record<string, string> = {
                  confirmed: 'text-green-400',
                  maybe: 'text-yellow-400',
                  declined: 'text-red-400',
                  pending: 'text-gray-400',
                }
                return (
                  <div key={invite.id} className="flex items-center justify-between">
                    <span className="text-sm text-white">{player.display_name}</span>
                    <select
                      value={invite.rsvp_status}
                      onChange={async (e) => {
                        await supabase
                          .from('game_invites')
                          .update({ rsvp_status: e.target.value, responded_at: new Date().toISOString() })
                          .eq('id', invite.id)
                        loadGameData()
                      }}
                      className={`rounded border border-border bg-card px-2 py-1 text-xs ${colors[invite.rsvp_status]}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="maybe">Maybe</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">Results</h2>
          <Button size="sm" onClick={() => setShowAddResult(!showAddResult)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Result
          </Button>
        </div>

        {showAddResult && (
          <Card className="mb-2 space-y-3">
            <Select
              value={newResult.player_id}
              onChange={(e) => setNewResult({ ...newResult, player_id: e.target.value })}
            >
              <option value="">Select player...</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.display_name}</option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400">Position</label>
                <Input
                  type="number"
                  min={1}
                  value={newResult.finish_position}
                  onChange={(e) => setNewResult({ ...newResult, finish_position: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Buy-in</label>
                <Input
                  type="number"
                  value={newResult.buy_in_amount}
                  onChange={(e) => setNewResult({ ...newResult, buy_in_amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Payout</label>
                <Input
                  type="number"
                  value={newResult.payout}
                  onChange={(e) => setNewResult({ ...newResult, payout: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Rebuys</label>
                <Input
                  type="number"
                  min={0}
                  value={newResult.rebuys}
                  onChange={(e) => setNewResult({ ...newResult, rebuys: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addResult}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddResult(false)}>Cancel</Button>
            </div>
          </Card>
        )}

        {results.length === 0 ? (
          <Card><p className="text-center text-sm text-gray-400 py-4">No results recorded yet</p></Card>
        ) : (
          <div className="space-y-2">
            {results.map((r) => {
              const player = players.find((p) => p.id === r.player_id)
              return (
                <Card key={r.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-sm font-bold text-gold">
                    {r.finish_position}
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-poker-green text-sm font-medium text-white">
                    {getInitials(player?.display_name ?? '?')}
                  </div>
                  <div className="flex-1">
                    <Link to={`/leagues/${leagueId}/players/${r.player_id}`} className="font-medium text-white hover:underline">
                      {player?.display_name ?? 'Unknown'}
                    </Link>
                    {r.rebuys > 0 && <p className="text-xs text-gray-400">{r.rebuys} rebuys</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gold">{r.points_earned} pts</p>
                    <p className={`text-xs ${Number(r.payout) - Number(r.buy_in_amount) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(Number(r.payout) - Number(r.buy_in_amount))}
                    </p>
                  </div>
                  <button onClick={() => deleteResult(r.id)} className="text-gray-600 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
      {...props}
    >
      {children}
    </select>
  )
}
