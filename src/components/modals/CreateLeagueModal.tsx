import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { DEFAULT_POINTS_SYSTEM } from '../../lib/points'
import type { League } from '../../types'

interface CreateLeagueModalProps {
  open: boolean
  onClose: () => void
  onCreated: (league: League) => void
}

export function CreateLeagueModal({ open, onClose, onCreated }: CreateLeagueModalProps) {
  const { user } = useAuthStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('leagues')
      .insert({
        name,
        description: description || null,
        points_system: DEFAULT_POINTS_SYSTEM,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    await supabase
      .from('seasons')
      .insert({ league_id: data.id, name: 'Season 1', is_active: true })

    setLoading(false)
    setName('')
    setDescription('')
    onCreated(data)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Create League">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</div>
        )}
        <div className="space-y-1.5">
          <label className="text-sm text-gray-400">League Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tuesday Night Poker"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-gray-400">Description (optional)</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Weekly $20 buy-in cash game"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating...' : 'Create League'}
        </Button>
      </form>
    </Modal>
  )
}
