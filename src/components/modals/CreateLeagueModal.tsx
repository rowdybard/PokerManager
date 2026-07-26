import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useAuthStore } from '../../store/authStore'
import { DEFAULT_POINTS_SYSTEM } from '../../lib/points'
import { createIdempotencyKey, createLeague, errorMessage } from '../../lib/homeGames'
import type { League } from '../../types'

interface CreateLeagueModalProps {
  open: boolean
  onClose: () => void
  onCreated: (league: League) => void
}

export function CreateLeagueModal({ open, onClose, onCreated }: CreateLeagueModalProps) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const schema = z.object({
    name: z.string().trim().min(2, 'Enter a league name.').max(80),
    description: z.string().trim().max(240).optional(),
  })
  type FormValues = z.infer<typeof schema>
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { name: '', description: '' },
  })

  const submit = handleSubmit(async (values) => {
    if (!user) return
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form and try again.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const league = await createLeague({
        name: parsed.data.name,
        description: parsed.data.description,
        ownerId: user.id,
        pointsSystem: DEFAULT_POINTS_SYSTEM,
        idempotencyKey: createIdempotencyKey('create-league'),
      })
      reset()
      onCreated(league)
      onClose()
    } catch (submitError) {
      setError(errorMessage(submitError, 'Could not create the league.'))
    } finally {
      setLoading(false)
    }
  })

  return (
    <Modal open={open} onClose={onClose} title="Create League">
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
        )}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted">League Name</label>
          <Input
            {...register('name', { required: true })}
            placeholder="Tuesday Night Poker"
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted">Description (optional)</label>
          <Input
            {...register('description')}
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
