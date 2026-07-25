import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { supabase } from '../../lib/supabase'
import type { Game, Player } from '../../types'

interface ScheduleGameModalProps {
  open: boolean
  onClose: () => void
  leagueId: string
  seasonId: string
  players: Player[]
  onCreated: (game: Game) => void
}

export function ScheduleGameModal({
  open,
  onClose,
  leagueId,
  seasonId,
  players,
  onCreated,
}: ScheduleGameModalProps) {
  const [scheduledDate, setScheduledDate] = useState('')
  const [buyIn, setBuyIn] = useState(20)
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [invitePlayerIds, setInvitePlayerIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const togglePlayer = (id: string) => {
    setInvitePlayerIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        league_id: leagueId,
        season_id: seasonId,
        scheduled_date: new Date(scheduledDate).toISOString(),
        buy_in: buyIn,
        location: location || null,
        notes: notes || null,
        status: 'scheduled',
      })
      .select()
      .single()

    if (gameError) {
      setError(gameError.message)
      setLoading(false)
      return
    }

    if (invitePlayerIds.length > 0) {
      const invites = invitePlayerIds.map((playerId) => ({
        game_id: game.id,
        player_id: playerId,
        rsvp_status: 'pending' as const,
      }))
      await supabase.from('game_invites').insert(invites)
    }

    setLoading(false)
    setScheduledDate('')
    setBuyIn(20)
    setLocation('')
    setNotes('')
    setInvitePlayerIds([])
    onCreated(game)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule Game">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</div>
        )}
        <div className="space-y-1.5">
          <label className="text-sm text-gray-400">Date & Time</label>
          <Input
            type="datetime-local"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-sm text-gray-400">Buy-in ($)</label>
            <Input
              type="number"
              min={0}
              value={buyIn}
              onChange={(e) => setBuyIn(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-gray-400">Location</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="My house"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-gray-400">Notes (optional)</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bring snacks!"
          />
        </div>
        {players.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm text-gray-400">Invite Players ({invitePlayerIds.length} selected)</label>
            <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
              {players.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-bg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={invitePlayerIds.includes(p.id)}
                    onChange={() => togglePlayer(p.id)}
                    className="accent-gold"
                  />
                  <span className="text-sm text-white">{p.display_name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Scheduling...' : 'Schedule Game'}
        </Button>
      </form>
    </Modal>
  )
}
