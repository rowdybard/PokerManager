import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.110.8'
import { decryptServerSecret } from './encryption.ts'
import { requiredEnv } from './env.ts'

export type PlaidEnvironment = 'sandbox' | 'development' | 'production'

export interface PlaidConnection {
  id: string
  owner_id: string
  item_id: string
  access_token_ciphertext: string | null
  cursor: string | null
  status: string
}

interface PlaidTransaction {
  transaction_id: string
  account_id: string
  name: string
  amount: number
  date: string
  pending: boolean
  iso_currency_code?: string | null
  unofficial_currency_code?: string | null
  [key: string]: unknown
}

interface PlaidSyncResponse {
  added: PlaidTransaction[]
  modified: PlaidTransaction[]
  removed: Array<{ transaction_id: string }>
  next_cursor: string
  has_more: boolean
}

interface PlaidError {
  error_code?: string
  error_message?: string
}

export function assertPlaidEnabled() {
  if (Deno.env.get('PLAID_ENABLED') !== 'true') {
    throw new Error('Plaid reconciliation is disabled.')
  }
  if (
    plaidEnvironment() === 'production' &&
    Deno.env.get('PLAID_PRODUCTION_APPROVED') !== 'true'
  ) {
    throw new Error('Plaid production access has not been approved.')
  }
}

export function plaidEnvironment(): PlaidEnvironment {
  const value = Deno.env.get('PLAID_ENVIRONMENT') ?? 'sandbox'
  if (!['sandbox', 'development', 'production'].includes(value)) {
    throw new Error('PLAID_ENVIRONMENT must be sandbox, development, or production.')
  }
  return value as PlaidEnvironment
}

export async function plaidRequest<T>(path: string, input: Record<string, unknown>): Promise<T> {
  assertPlaidEnabled()
  const response = await fetch(`https://${plaidEnvironment()}.plaid.com${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PLAID-CLIENT-ID': requiredEnv('PLAID_CLIENT_ID'),
      'PLAID-SECRET': requiredEnv('PLAID_SECRET'),
    },
    body: JSON.stringify(input),
  })

  const result = (await response.json().catch(() => ({}))) as T & PlaidError
  if (!response.ok) {
    const error = new Error(result.error_message || `Plaid returned ${response.status}.`)
    Object.assign(error, { code: result.error_code })
    throw error
  }
  return result
}

function transactionRow(
  ownerId: string,
  connectionId: string,
  transaction: PlaidTransaction,
) {
  const currency =
    transaction.iso_currency_code?.toUpperCase() ??
    transaction.unofficial_currency_code?.toUpperCase() ??
    'USD'
  const normalizedCurrency = /^[A-Z]{3}$/.test(currency) ? currency : 'USD'
  const digits =
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  const amountMinor = Math.round(transaction.amount * 10 ** digits)

  return {
    owner_id: ownerId,
    connection_id: connectionId,
    plaid_transaction_id: transaction.transaction_id,
    account_id: transaction.account_id,
    name: transaction.name,
    amount_minor: amountMinor,
    currency: normalizedCurrency,
    date: transaction.date,
    pending: transaction.pending,
    removed_at: null,
    raw_payload: transaction,
  }
}

export async function syncPlaidConnection(
  admin: SupabaseClient,
  connection: PlaidConnection,
): Promise<{ added: number; modified: number; removed: number; cursor: string }> {
  if (!connection.access_token_ciphertext) {
    throw new Error('Plaid connection token is unavailable.')
  }
  const accessToken = await decryptServerSecret(
    connection.access_token_ciphertext,
    connection.owner_id,
  )
  const startingCursor = connection.cursor
  let restarts = 0

  while (true) {
    let cursor = startingCursor
    const added: PlaidTransaction[] = []
    const modified: PlaidTransaction[] = []
    const removed: Array<{ transaction_id: string }> = []

    try {
      let hasMore = true
      while (hasMore) {
        const page = await plaidRequest<PlaidSyncResponse>('/transactions/sync', {
          access_token: accessToken,
          cursor: cursor ?? undefined,
          count: 500,
          options: { include_original_description: true },
        })
        added.push(...page.added)
        modified.push(...page.modified)
        removed.push(...page.removed)
        cursor = page.next_cursor
        hasMore = page.has_more
      }
    } catch (error) {
      if (
        (error as { code?: string }).code ===
          'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION' &&
        restarts < 2
      ) {
        restarts += 1
        continue
      }
      throw error
    }

    const changed = [...added, ...modified].map((transaction) =>
      transactionRow(connection.owner_id, connection.id, transaction),
    )
    if (changed.length) {
      const { error } = await admin
        .from('plaid_reconciliation_candidates')
        .upsert(changed, { onConflict: 'plaid_transaction_id' })
      if (error) throw error
    }

    if (removed.length) {
      const removedAt = new Date().toISOString()
      for (const transaction of removed) {
        const { error } = await admin
          .from('plaid_reconciliation_candidates')
          .update({ removed_at: removedAt })
          .eq('owner_id', connection.owner_id)
          .eq('plaid_transaction_id', transaction.transaction_id)
        if (error) throw error
      }
    }

    const { error: cursorError } = await admin
      .from('plaid_connections')
      .update({ cursor, updated_at: new Date().toISOString(), last_error: null })
      .eq('id', connection.id)
      .eq('owner_id', connection.owner_id)
    if (cursorError) throw cursorError

    return {
      added: added.length,
      modified: modified.length,
      removed: removed.length,
      cursor: cursor ?? '',
    }
  }
}
