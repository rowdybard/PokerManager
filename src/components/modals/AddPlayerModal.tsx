import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { supabase } from '../../lib/supabase'
import { createContact, deleteContact, errorMessage, linkContactToLeague } from '../../lib/homeGames'
import { useAuthStore } from '../../store/authStore'
import type { Player } from '../../types'

interface AddPlayerModalProps {
  open: boolean
  onClose: () => void
  leagueId: string
  onCreated: (player: Player) => void
}

export function AddPlayerModal({ open, onClose, leagueId, onCreated }: AddPlayerModalProps) {
  const user = useAuthStore((state) => state.user)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!user) {
      setError('Sign in before adding a player.')
      setLoading(false)
      return
    }
    let contactId: string | null = null
    let playerId: string | null = null
    try {
      const contact = await createContact({
        ownerId: user.id,
        displayName,
        email,
        phone,
      })
      contactId = contact.id
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          league_id: leagueId,
          display_name: displayName.trim(),
          contact_id: contact.id,
        })
        .select()
        .single()
      if (playerError) throw playerError
      playerId = player.id
      await linkContactToLeague(leagueId, contact.id, player.id)
      setDisplayName('')
      setEmail('')
      setPhone('')
      onCreated(player as Player)
      onClose()
    } catch (submitError) {
      if (playerId) await supabase.from('players').delete().eq('id', playerId)
      if (contactId) await deleteContact(contactId)
      setError(errorMessage(submitError, 'Could not add the player.'))
    } finally {
      setLoading(false)
    }
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
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted">Email (optional)</label>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted">Phone (optional)</label>
            <Input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Adding...' : 'Add Player'}
        </Button>
      </form>
    </Modal>
  )
}
