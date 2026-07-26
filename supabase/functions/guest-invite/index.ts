import { errorResponse, HttpError, json, options, readJson, requirePost } from '../_shared/http.ts'
import { randomUrlToken, sha256Hex } from '../_shared/crypto.ts'
import { createAdminClient, requireUser } from '../_shared/supabase.ts'

type GuestInviteRequest =
  | {
      action: 'issue'
      gameId: string
    }
  | {
      action: 'view'
      token: string
    }
  | {
      action: 'rsvp'
      token: string
      status: 'yes' | 'maybe' | 'no'
      guestCount: number
      idempotencyKey: string
    }

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return options(request)

  try {
    requirePost(request)
    const body = await readJson<GuestInviteRequest>(request, 4_096)
    const admin = createAdminClient()

    if (body?.action === 'issue') {
      if (!UUID_PATTERN.test(body.gameId ?? '')) {
        throw new HttpError(400, 'A valid game is required.')
      }
      const { user } = await requireUser(request)
      const token = randomUrlToken()
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString()
      const { data, error } = await admin.rpc('issue_guest_invite', {
        p_game_id: body.gameId,
        p_token_hash: await sha256Hex(token),
        p_actor_id: user.id,
        p_expires_at: expiresAt,
      })
      if (error) {
        if (error.code === '42501') throw new HttpError(403, 'Only a host can issue invites.')
        throw error
      }
      return json(request, {
        token,
        expiresAt:
          data && typeof data === 'object' && 'expiresAt' in data
            ? data.expiresAt
            : expiresAt,
      })
    }

    if (!body || !('token' in body) || !TOKEN_PATTERN.test(body.token ?? '')) {
      throw new HttpError(404, 'This invitation is invalid, expired, or revoked.')
    }

    const tokenHash = await sha256Hex(body.token)

    if (body.action === 'view') {
      const { data, error } = await admin.rpc('get_guest_invitation', {
        p_token_hash: tokenHash,
      })
      if (error || !data) {
        throw new HttpError(404, 'This invitation is invalid, expired, or revoked.')
      }
      return json(request, data)
    }

    if (body.action !== 'rsvp') {
      throw new HttpError(400, 'Unsupported invitation action.')
    }
    if (!['yes', 'maybe', 'no'].includes(body.status)) {
      throw new HttpError(400, 'Choose Yes, Maybe, or No.')
    }
    if (!Number.isInteger(body.guestCount) || body.guestCount < 0 || body.guestCount > 4) {
      throw new HttpError(400, 'Guest count must be between 0 and 4.')
    }
    if (!UUID_PATTERN.test(body.idempotencyKey ?? '')) {
      throw new HttpError(400, 'A valid idempotency key is required.')
    }

    const { data, error } = await admin.rpc('respond_to_guest_invitation', {
      p_token_hash: tokenHash,
      p_status: body.status,
      p_guest_count: body.guestCount,
      p_idempotency_key: body.idempotencyKey,
    })

    if (error || !data) {
      if (error?.code === '23505') {
        throw new HttpError(409, 'That response is already being processed.')
      }
      throw new HttpError(404, 'This invitation is invalid, expired, or revoked.')
    }

    return json(request, data)
  } catch (error) {
    return errorResponse(request, error)
  }
})
