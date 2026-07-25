import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { supabase } from '../../lib/supabase'

interface InviteMembersModalProps {
  open: boolean
  onClose: () => void
  leagueId: string
  leagueName: string
}

export function InviteMembersModal({ open, onClose, leagueId, leagueName }: InviteMembersModalProps) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const inviteUrl = `${window.location.origin}/#/leagues/${leagueId}`

  async function handleInvite() {
    if (!inviteEmail) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { data: userData } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', inviteEmail)
      .single()

    if (userData) {
      const { error: memberError } = await supabase
        .from('league_members')
        .insert({
          league_id: leagueId,
          user_id: userData.id,
          role: 'member',
        })

      if (memberError) {
        setError(memberError.message)
      } else {
        setSuccess(`Added ${inviteEmail} to the league!`)
        setInviteEmail('')
      }
    } else {
      setSuccess(`Share the league link with ${inviteEmail}. They'll join once they create an account.`)
      setInviteEmail('')
    }

    setLoading(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal open={open} onClose={onClose} title={`Invite to ${leagueName}`}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</div>
        )}
        {success && (
          <div className="rounded-lg bg-green-900/30 px-3 py-2 text-sm text-green-400">{success}</div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm text-gray-400">Invite by email</label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="player@example.com"
            />
            <Button onClick={handleInvite} disabled={loading || !inviteEmail}>
              Invite
            </Button>
          </div>
          <p className="text-xs text-gray-500">If they have an account, they'll be added automatically.</p>
        </div>

        <div className="border-t border-border pt-4">
          <label className="text-sm text-gray-400">Or share league link</label>
          <div className="mt-1.5 flex gap-2">
            <Input value={inviteUrl} readOnly className="text-xs" />
            <Button variant="secondary" onClick={copyLink}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
