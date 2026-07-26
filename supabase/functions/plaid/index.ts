import { errorResponse, HttpError, json, options, readJson, requirePost } from '../_shared/http.ts'
import { encryptServerSecret } from '../_shared/encryption.ts'
import { requiredEnv } from '../_shared/env.ts'
import {
  assertPlaidEnabled,
  plaidEnvironment,
  plaidRequest,
  syncPlaidConnection,
  type PlaidConnection,
} from '../_shared/plaid.ts'
import { createAdminClient, requireUser } from '../_shared/supabase.ts'

type PlaidRequestBody =
  | { action: 'status' }
  | { action: 'create_link_token' }
  | { action: 'exchange_public_token'; publicToken: string; institutionName?: string }
  | { action: 'sync'; connectionId: string }
  | { action: 'disconnect'; connectionId: string }

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return options(request)

  try {
    requirePost(request)
    assertPlaidEnabled()
    const { user } = await requireUser(request)
    const body = await readJson<PlaidRequestBody>(request, 8_192)
    const admin = createAdminClient()

    if (body.action === 'status') {
      const { data: connections, error } = await admin
        .from('plaid_connections')
        .select('id, institution_name, status, last_error, created_at, updated_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return json(request, {
        enabled: true,
        environment: plaidEnvironment(),
        readOnly: true,
        connections: connections ?? [],
      })
    }

    if (body.action === 'create_link_token') {
      const data = await plaidRequest<{ link_token: string; expiration: string }>(
        '/link/token/create',
        {
          client_name: 'Poker Manager',
          language: 'en',
          country_codes: ['US'],
          user: { client_user_id: user.id },
          products: ['transactions'],
          webhook: requiredEnv('PLAID_WEBHOOK_URL'),
        },
      )
      return json(request, { linkToken: data.link_token, expiration: data.expiration })
    }

    if (body.action === 'exchange_public_token') {
      if (
        !body.publicToken ||
        body.publicToken.length > 1_024 ||
        (body.institutionName?.length ?? 0) > 200
      ) {
        throw new HttpError(400, 'Invalid Plaid Link result.')
      }
      const data = await plaidRequest<{ access_token: string; item_id: string }>(
        '/item/public_token/exchange',
        { public_token: body.publicToken },
      )
      const ciphertext = await encryptServerSecret(data.access_token, user.id)
      const { data: connection, error } = await admin
        .from('plaid_connections')
        .upsert(
          {
            owner_id: user.id,
            item_id: data.item_id,
            access_token_ciphertext: ciphertext,
            institution_name: body.institutionName?.trim() || null,
            status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'owner_id,item_id' },
        )
        .select('id, institution_name, status, created_at, updated_at')
        .single()
      if (error) throw error
      return json(request, { connection })
    }

    if (body.action === 'sync' || body.action === 'disconnect') {
      if (!UUID_PATTERN.test(body.connectionId ?? '')) {
        throw new HttpError(400, 'Invalid reconciliation connection.')
      }
      const { data, error } = await admin
        .from('plaid_connections')
        .select('id, owner_id, item_id, access_token_ciphertext, cursor, status')
        .eq('id', body.connectionId)
        .eq('owner_id', user.id)
        .single()
      if (error || !data) throw new HttpError(404, 'Reconciliation connection not found.')
      const connection = data as PlaidConnection

      if (body.action === 'sync') {
        if (connection.status !== 'active') {
          throw new HttpError(409, 'Reconnect this institution before syncing.')
        }
        return json(request, { sync: await syncPlaidConnection(admin, connection) })
      }

      if (
        connection.status === 'disconnected' ||
        !connection.access_token_ciphertext
      ) {
        return json(request, { disconnected: true, duplicate: true })
      }

      const { decryptServerSecret } = await import('../_shared/encryption.ts')
      const accessToken = await decryptServerSecret(
        connection.access_token_ciphertext,
        connection.owner_id,
      )
      await plaidRequest('/item/remove', { access_token: accessToken })
      const { error: updateError } = await admin
        .from('plaid_connections')
        .update({
          status: 'disconnected',
          access_token_ciphertext: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connection.id)
        .eq('owner_id', user.id)
      if (updateError) throw updateError
      return json(request, { disconnected: true })
    }

    throw new HttpError(400, 'Unsupported Plaid action.')
  } catch (error) {
    if (error instanceof Error && error.message.includes('disabled')) {
      return errorResponse(request, new HttpError(503, error.message))
    }
    return errorResponse(request, error)
  }
})
