import { useState } from 'react'
import { FlaskConical, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { calculatePoints } from '../lib/points'
import type { PointsSystem } from '../types'

const MOCK_PLAYERS = [
  'Big Mike', 'Snake', 'The Professor', 'Lucky Lou', 'Cool Hand',
  'Doc', 'The Shark', 'Rookie Ray', 'Grumpy Gary', 'Smooth Pete',
]

const MOCK_LOCATIONS = ['Mikes Garage', 'Downtown Club', 'Vegas Room', 'Mansion']

export function MockDataSeeder() {
  const { user } = useAuthStore()
  const [seeding, setSeeding] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function seedMockData() {
    if (!user) return
    setSeeding(true)
    setMessage(null)

    try {
      const pointsSystem: PointsSystem = {
        type: 'position',
        positionPoints: { '1': 10, '2': 7, '3': 5, '4': 4, '5': 3, '6': 2, '7': 1 },
        participationPoints: 1,
      }

      // Create league (RLS requires owner_id = auth.uid())
      const { data: league, error: leagueErr } = await supabase
        .from('leagues')
        .insert({
          name: 'Thursday Night Poker',
          description: 'Weekly cash game with the boys',
          owner_id: user.id,
          points_system: pointsSystem,
        })
        .select()
        .single()

      if (leagueErr) throw leagueErr

      // Owner membership row is auto-created by DB trigger

      // Create season
      const { data: season, error: seasonErr } = await supabase
        .from('seasons')
        .insert({
          league_id: league.id,
          name: 'Summer 2025',
          start_date: '2025-06-01',
          end_date: '2025-09-30',
          is_active: true,
        })
        .select()
        .single()

      if (seasonErr) throw seasonErr

      // Create players
      const playerInserts = MOCK_PLAYERS.map((name) => ({
        league_id: league.id,
        display_name: name,
      }))
      const { data: players, error: playersErr } = await supabase
        .from('players')
        .insert(playerInserts)
        .select()

      if (playersErr) throw playersErr

      // Create 6 completed games with results
      const now = new Date()
      for (let g = 0; g < 6; g++) {
        const gameDate = new Date(now)
        gameDate.setDate(gameDate.getDate() - (g * 14 + 7))

        const numPlayers = 6 + Math.floor(Math.random() * 3)
        const gamePlayers = [...players]
          .sort(() => Math.random() - 0.5)
          .slice(0, numPlayers)

        const buyIn = [20, 50, 100][Math.floor(Math.random() * 3)]
        const pot = buyIn * numPlayers

        const { data: game, error: gameErr } = await supabase
          .from('games')
          .insert({
            season_id: season.id,
            league_id: league.id,
            scheduled_date: gameDate.toISOString(),
            status: 'completed',
            buy_in: buyIn,
            location: MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)],
            notes: g === 0 ? 'Great game, big pot!' : null,
          })
          .select()
          .single()

        if (gameErr) throw gameErr

        // Create results
        const results = gamePlayers.map((player, idx) => {
          const position = idx + 1
          const payout = position === 1 ? pot * 0.5
            : position === 2 ? pot * 0.3
            : position === 3 ? pot * 0.2
            : 0
          const points = calculatePoints(position, numPlayers, pointsSystem)
          return {
            game_id: game.id,
            player_id: player.id,
            finish_position: position,
            buy_in_amount: buyIn,
            payout,
            points_earned: points,
            rebuys: Math.floor(Math.random() * 2),
          }
        })

        const { error: resultsErr } = await supabase
          .from('game_results')
          .insert(results)

        if (resultsErr) throw resultsErr
      }

      // Create 1 upcoming scheduled game
      const upcomingDate = new Date(now)
      upcomingDate.setDate(upcomingDate.getDate() + 7)
      const { data: upcomingGame, error: upcomingErr } = await supabase
        .from('games')
        .insert({
          season_id: season.id,
          league_id: league.id,
          scheduled_date: upcomingDate.toISOString(),
          status: 'scheduled',
          buy_in: 50,
          location: 'Mikes Garage',
          notes: 'Bring snacks!',
        })
        .select()
        .single()

      if (upcomingErr) throw upcomingErr

      // Create RSVP invites for upcoming game
      const inviteInserts = players.slice(0, 8).map((p) => ({
        game_id: upcomingGame.id,
        player_id: p.id,
        rsvp_status: ['confirmed', 'maybe', 'pending', 'confirmed', 'declined', 'confirmed', 'maybe', 'confirmed'][Math.floor(Math.random() * 5)],
      }))
      await supabase.from('game_invites').insert(inviteInserts)

      setMessage('Seeded: 1 league, 1 season, 10 players, 6 completed games, 1 upcoming game')
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      setMessage(`Error: ${msg}`)
    } finally {
      setSeeding(false)
    }
  }

  async function clearMockData() {
    if (!user) return
    setClearing(true)
    setMessage(null)

    try {
      // Find mock leagues
      const { data: mockLeagues } = await supabase
        .from('leagues')
        .select('id')
        .eq('owner_id', user.id)
        .eq('name', 'Thursday Night Poker')

      if (mockLeagues && mockLeagues.length > 0) {
        // Deleting the league cascades to everything
        const { error } = await supabase
          .from('leagues')
          .delete()
          .in('id', mockLeagues.map((l) => l.id))

        if (error) throw error
        setMessage(`Cleared ${mockLeagues.length} mock league(s) and all related data`)
      } else {
        setMessage('No mock data found to clear')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      setMessage(`Error: ${msg}`)
    } finally {
      setClearing(false)
    }
  }

  return (
    <Card className="border-dashed border-border">
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical className="h-5 w-5 text-gold" />
        <p className="text-base font-semibold text-ink">Test Data</p>
      </div>
      <div className="flex gap-3">
        <Button size="sm" variant="secondary" onClick={seedMockData} disabled={seeding || clearing}>
          {seeding ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-1.5 h-4 w-4" />}
          {seeding ? 'Seeding...' : 'Add Mock Data'}
        </Button>
        <Button size="sm" variant="danger" onClick={clearMockData} disabled={seeding || clearing}>
          {clearing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
          {clearing ? 'Clearing...' : 'Remove Mock Data'}
        </Button>
      </div>
      {message && (
        <p className="mt-3 text-sm text-muted">{message}</p>
      )}
    </Card>
  )
}
