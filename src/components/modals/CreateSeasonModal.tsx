import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { supabase } from '../../lib/supabase'
import type { Season } from '../../types'

interface CreateSeasonModalProps {
  open: boolean
  onClose: () => void
  leagueId: string
  onCreated: (season: Season) => void
}

export function CreateSeasonModal({ open, onClose, leagueId, onCreated }: CreateSeasonModalProps) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('seasons')
      .insert({
        league_id: leagueId,
        name,
        start_date: startDate || null,
        end_date: endDate || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setName('')
    setStartDate('')
    setEndDate('')
    onCreated(data)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="New Season">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
        )}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted">Season Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="2025 Spring Season"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted">Start Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted">End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating...' : 'Create Season'}
        </Button>
      </form>
    </Modal>
  )
}
