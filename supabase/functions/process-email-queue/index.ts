import { errorResponse, HttpError, json, options, requirePost } from '../_shared/http.ts'
import { requireSecretHeader } from '../_shared/crypto.ts'
import { requiredEnv } from '../_shared/env.ts'
import { createAdminClient } from '../_shared/supabase.ts'

interface EmailQueueRow {
  id: string
  to_email: string
  subject: string
  html_body: string | null
  text_body: string | null
  idempotency_key: string
  attempt_count: number
}

function retryAt(attempt: number) {
  const delayMinutes = Math.min(360, 2 ** Math.max(0, attempt) * 5)
  return new Date(Date.now() + delayMinutes * 60_000).toISOString()
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return options(request)

  try {
    requirePost(request)
    if (Deno.env.get('EMAIL_ENABLED') !== 'true') {
      return json(request, {
        enabled: false,
        processed: 0,
        message: 'Email is disabled until a sender domain is verified.',
      })
    }

    requireSecretHeader(
      request,
      'x-cron-secret',
      requiredEnv('EMAIL_PROCESSOR_SECRET'),
    )

    const apiKey = requiredEnv('RESEND_API_KEY')
    const from = requiredEnv('RESEND_FROM_EMAIL')
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('claim_email_queue', { p_limit: 25 })

    if (error) throw error
    const jobs = (data ?? []) as EmailQueueRow[]
    let sent = 0
    let failed = 0

    for (const job of jobs) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': job.idempotency_key,
          },
          body: JSON.stringify({
            from,
            to: [job.to_email],
            subject: job.subject,
            html: job.html_body ?? undefined,
            text: job.text_body ?? undefined,
          }),
        })

        const result = (await response.json().catch(() => ({}))) as {
          id?: string
          message?: string
        }
        if (!response.ok || !result.id) {
          throw new Error(result.message || `Resend returned ${response.status}.`)
        }

        const { error: updateError } = await admin
          .from('email_queue')
          .update({
            status: 'sent',
            provider_message_id: result.id,
            processed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', job.id)
        if (updateError) throw updateError
        sent += 1
      } catch (sendError) {
        failed += 1
        const attempts = Math.max(1, job.attempt_count ?? 1)
        const finalFailure = attempts >= 5
        await admin
          .from('email_queue')
          .update({
            status: finalFailure ? 'failed' : 'queued',
            attempt_count: attempts,
            next_attempt_at: finalFailure
              ? '9999-12-31T23:59:59.999Z'
              : retryAt(attempts),
            last_error:
              sendError instanceof Error
                ? sendError.message.slice(0, 500)
                : 'Unknown email provider error',
          })
          .eq('id', job.id)
      }
    }

    return json(request, { enabled: true, claimed: jobs.length, sent, failed })
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid request secret.') {
      return errorResponse(request, new HttpError(401, 'Unauthorized.'))
    }
    return errorResponse(request, error)
  }
})
