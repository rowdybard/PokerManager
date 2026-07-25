import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { supabase } from '../../lib/supabase'
import type { Player } from '../../types'

interface AddPlayerModalProps {
  open: boolean
  onClose: () => void
  leagueId: string
  onCreated: (player: Player) => void
}

export function AddPlayerModal({ open, onClose, leagueId, onCreated }: AddPlayerModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('players')
      .insert({
        league_id: leagueId,
        display_name: displayName,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setDisplayName('')
    onCreated(data)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Player">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
        )}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted">Player Name</label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="John Doe"
            required
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Adding...' : 'Add Player'}
        </Button>
      </form>
    </Modal>
  )
}
