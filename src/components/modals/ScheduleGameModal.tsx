import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import {
  createGameFromTemplate,
  createIdempotencyKey,
  errorMessage,
  type GameTemplateDetail,
  type HomeGame,
} from '../../lib/homeGames'

interface ScheduleGameModalProps {
  open: boolean
  onClose: () => void
  templates: GameTemplateDetail[]
  initialTemplateId?: string
  onCreated: (game: HomeGame) => void
}

const scheduleSchema = z.object({
  templateId: z.string().uuid('Choose a recurring game template.'),
  scheduledDate: z.string().min(1, 'Choose a date and time.'),
  title: z.string().trim().max(100).optional(),
})

export function ScheduleGameModal({
  open,
  onClose,
  templates,
  initialTemplateId,
  onCreated,
}: ScheduleGameModalProps) {
  const [templateId, setTemplateId] = useState(initialTemplateId ?? templates[0]?.id ?? '')
  const [scheduledDate, setScheduledDate] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) setTemplateId(initialTemplateId ?? templates[0]?.id ?? '')
  }, [initialTemplateId, open, templates])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const parsed = scheduleSchema.safeParse({ templateId, scheduledDate, title })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the schedule details.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const game = await createGameFromTemplate({
        templateId: parsed.data.templateId,
        scheduledDate: parsed.data.scheduledDate,
        title: parsed.data.title,
        idempotencyKey: createIdempotencyKey('create-game'),
      })
      setScheduledDate('')
      setTitle('')
      onCreated(game)
      onClose()
    } catch (submitError) {
      setError(errorMessage(submitError, 'Could not create the game.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Game From Template">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </div>
        )}
        {templates.length === 0 ? (
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm text-ink">
            Create a recurring game template first. Templates keep stakes, capacity, invitees, and
            tournament structure consistent.
          </div>
        ) : (
          <>
            <label className="block space-y-1.5 text-sm font-medium text-muted">
              Template
              <Select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {template.kind}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-muted">
              Date & time
              <Input
                type="datetime-local"
                value={scheduledDate}
                onChange={(event) => setScheduledDate(event.target.value)}
                required
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-muted">
              Event title (optional)
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Friday night championship"
              />
            </label>
          </>
        )}
        <Button type="submit" disabled={loading || templates.length === 0} className="w-full">
          {loading ? 'Creating…' : 'Create game'}
        </Button>
      </form>
    </Modal>
  )
}
