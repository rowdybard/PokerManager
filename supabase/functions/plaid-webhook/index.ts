import {
  decodeProtectedHeader,
  importJWK,
  jwtVerify,
  type JWK,
} from 'npm:jose@6.2.4'
import { sha256Hex, timingSafeEqual } from '../_shared/crypto.ts'
import { errorResponse, HttpError, json, options, requirePost } from '../_shared/http.ts'
import {
  assertPlaidEnabled,
  plaidRequest,
  syncPlaidConnection,
  type PlaidConnection,
} from '../_shared/plaid.ts'
import { createAdminClient } from '../_shared/supabase.ts'

interface PlaidWebhookPayload {
  webhook_type?: string
  webhook_code?: string
  item_id?: string
  [key: string]: unknown
}

async function verifyPlaidWebhook(rawBody: string, verification: string) {
  let header: ReturnType<typeof decodeProtectedHeader>
  try {
    header = decodeProtectedHeader(verification)
  } catch {
    throw new HttpError(400, 'Invalid Plaid verification token.')
  }
  if (header.alg !== 'ES256' || typeof header.kid !== 'string') {
    throw new HttpError(400, 'Unsupported Plaid verification token.')
  }

  const { key } = await plaidRequest<{ key: JWK }>(
    '/webhook_verification_key/get',
    { key_id: header.kid },
  )
  const publicKey = await importJWK(key, 'ES256')
  let payload: { iat?: number; request_body_sha256?: string }
  try {
    const verified = await jwtVerify(verification, publicKey, {
      algorithms: ['ES256'],
    })
    payload = verified.payload
  } catch {
    throw new HttpError(400, 'Invalid Plaid webhook signature.')
  }

  const nowSeconds = Math.floor(Date.now() / 1_000)
  if (
    typeof payload.iat !== 'number' ||
    payload.iat > nowSeconds + 30 ||
    nowSeconds - payload.iat > 300
  ) {
    throw new HttpError(400, 'Expired Plaid webhook signature.')
  }
  if (typeof payload.request_body_sha256 !== 'string') {
    throw new HttpError(400, 'Missing Plaid webhook body digest.')
  }

  const actualDigest = await sha256Hex(rawBody)
  if (!timingSafeEqual(actualDigest, payload.request_body_sha256)) {
    throw new HttpError(400, 'Plaid webhook body digest did not match.')
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return options(request)

  try {
    requirePost(request)
    assertPlaidEnabled()
    const verification = request.headers.get('plaid-verification')
    if (!verification) throw new HttpError(400, 'Missing Plaid verification token.')

    const rawBody = await request.text()
    await verifyPlaidWebhook(rawBody, verification)

    let event: PlaidWebhookPayload
    try {
      event = JSON.parse(rawBody) as PlaidWebhookPayload
    } catch {
      throw new HttpError(400, 'Invalid webhook body.')
    }

    const providerEventId = await sha256Hex(`${verification}.${rawBody}`)
    const admin = createAdminClient()
    const { data: insertedEvent, error: insertError } = await admin
      .from('plaid_webhook_events')
      .insert({
        provider_event_id: providerEventId,
        event_type: `${event.webhook_type ?? 'UNKNOWN'}.${event.webhook_code ?? 'UNKNOWN'}`,
        item_id: event.item_id ?? null,
        payload: event,
      })
      .select('id, processed_at')
      .single()

    let storedEvent = insertedEvent
    if (insertError?.code === '23505') {
      const { data: existingEvent, error: existingError } = await admin
        .from('plaid_webhook_events')
        .select('id, processed_at')
        .eq('provider_event_id', providerEventId)
        .single()
      if (existingError) throw existingError
      if (existingEvent.processed_at) {
        return json(request, { received: true, duplicate: true })
      }
      storedEvent = existingEvent
    } else if (insertError) {
      throw insertError
    }
    if (!storedEvent) throw new Error('Plaid webhook event could not be recorded.')
    const storedEventId = storedEvent.id

    const markProcessed = async () => {
      const { error } = await admin
        .from('plaid_webhook_events')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', storedEventId)
      if (error) throw error
    }

    if (
      event.webhook_type !== 'TRANSACTIONS' ||
      event.webhook_code !== 'SYNC_UPDATES_AVAILABLE' ||
      typeof event.item_id !== 'string'
    ) {
      await markProcessed()
      return json(request, { received: true, handled: false })
    }

    const { data, error } = await admin
      .from('plaid_connections')
      .select('id, owner_id, item_id, access_token_ciphertext, cursor, status')
      .eq('item_id', event.item_id)
      .eq('status', 'active')
      .maybeSingle()
    if (error) throw error
    if (!data) {
      await markProcessed()
      return json(request, { received: true, handled: false })
    }

    try {
      const result = await syncPlaidConnection(admin, data as PlaidConnection)
      await markProcessed()
      return json(request, { received: true, handled: true, sync: result })
    } catch (syncError) {
      await admin
        .from('plaid_connections')
        .update({
          last_error:
            syncError instanceof Error ? syncError.message.slice(0, 500) : 'Sync failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id)
      throw syncError
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('disabled')) {
      return errorResponse(request, new HttpError(503, error.message))
    }
    return errorResponse(request, error)
  }
})
