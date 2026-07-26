import { Webhook } from 'npm:svix@1.99.1'
import { errorResponse, HttpError, json, options, requirePost } from '../_shared/http.ts'
import { requiredEnv } from '../_shared/env.ts'
import { createAdminClient } from '../_shared/supabase.ts'

interface ResendWebhookEvent {
  type: string
  created_at?: string
  data?: {
    email_id?: string
  }
  [key: string]: unknown
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return options(request)

  try {
    requirePost(request)
    const id = request.headers.get('svix-id')
    const timestamp = request.headers.get('svix-timestamp')
    const signature = request.headers.get('svix-signature')
    if (!id || !timestamp || !signature) {
      throw new HttpError(400, 'Missing webhook signature.')
    }

    const rawBody = await request.text()
    let event: ResendWebhookEvent
    try {
      event = new Webhook(requiredEnv('RESEND_WEBHOOK_SECRET')).verify(rawBody, {
        'svix-id': id,
        'svix-timestamp': timestamp,
        'svix-signature': signature,
      }) as ResendWebhookEvent
    } catch {
      throw new HttpError(400, 'Invalid webhook signature.')
    }

    const admin = createAdminClient()
    const providerMessageId = event.data?.email_id
    if (!providerMessageId) {
      throw new HttpError(400, 'Webhook does not reference an email.')
    }
    const { data: inserted, error: recordError } = await admin.rpc(
      'record_email_webhook_event',
      {
        p_provider_event_id: id,
        p_event_type: event.type,
        p_provider_message_id: providerMessageId,
        p_occurred_at: event.created_at ?? new Date().toISOString(),
        p_payload: event,
      },
    )
    if (recordError) throw recordError

    return json(request, { received: true, duplicate: inserted === false })
  } catch (error) {
    return errorResponse(request, error)
  }
})
