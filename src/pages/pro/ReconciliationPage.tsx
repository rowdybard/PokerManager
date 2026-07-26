import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from 'react-plaid-link'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import {
  FormFeedback,
  FormSelect,
  ProEmpty,
  ProError,
  ProLoading,
  ProPage,
  useProResource,
} from '../../components/pro'
import { useAuthStore } from '../../store/authStore'
import {
  forgetPlaidConnection,
  formatDate,
  formatMinor,
  invokePlaidFunction,
  listLedgerEntries,
  listPlaidCandidates,
  PLAID_ENABLED,
  rememberedPlaidConnection,
  rememberPlaidConnection,
  updatePlaidCandidate,
  type PlaidConnection,
  type PlaidCandidate,
  type PlaidStatus,
  type LedgerEntry,
} from '../../lib/pro'
import { Landmark, Link2, RefreshCw, ShieldCheck, Unlink } from 'lucide-react'

interface LinkTokenResponse {
  linkToken: string
  expiration: string
}

interface ExchangeResponse {
  connection: PlaidConnection
}

interface ReconciliationData {
  status: PlaidStatus | null
  candidates: PlaidCandidate[]
  ledger: LedgerEntry[]
}

function loadReconciliation(ownerId: string): Promise<ReconciliationData> {
  if (!PLAID_ENABLED) {
    return Promise.resolve({ status: null, candidates: [], ledger: [] })
  }
  return Promise.all([
    invokePlaidFunction<PlaidStatus>('status'),
    listPlaidCandidates(ownerId),
    listLedgerEntries(ownerId, 1_000),
  ]).then(([status, candidates, ledger]) => ({ status, candidates, ledger }))
}

export function ReconciliationPage() {
  const ownerId = useAuthStore((state) => state.user?.id)
  const resource = useProResource(['pro', 'reconciliation', ownerId, PLAID_ENABLED], () => {
    if (!ownerId) throw new Error('Sign in to view reconciliation.')
    return loadReconciliation(ownerId)
  })
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({})
  const [selectedLedger, setSelectedLedger] = useState<Record<string, string>>({})
  const shouldOpen = useRef(false)
  const reload = resource.reload

  const onSuccess = useCallback(
    async (publicToken: string | null, metadata: PlaidLinkOnSuccessMetadata) => {
      if (!publicToken) {
        setFeedback({ error: 'Plaid Link did not return a public token.' })
        return
      }
      if (!ownerId) {
        setFeedback({ error: 'Sign in again before connecting an institution.' })
        return
      }
      setWorking(true)
      setFeedback({})
      try {
        const result = await invokePlaidFunction<ExchangeResponse>('exchange_public_token', {
          publicToken,
          institutionName: metadata.institution?.name,
        })
        rememberPlaidConnection(ownerId, result.connection.id)
        await invokePlaidFunction('sync', { connectionId: result.connection.id })
        setFeedback({ success: 'Read-only institution connected and transactions synced.' })
        setLinkToken(null)
        await reload()
      } catch (error) {
        setFeedback({ error: error instanceof Error ? error.message : 'Could not connect institution.' })
      } finally {
        setWorking(false)
      }
    },
    [ownerId, reload],
  )

  const { open, ready, error: plaidScriptError } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: (error) => {
      shouldOpen.current = false
      if (error) setFeedback({ error: error.display_message || error.error_message })
    },
  })

  useEffect(() => {
    if (linkToken && ready && shouldOpen.current) {
      shouldOpen.current = false
      open()
    }
  }, [linkToken, open, ready])

  const connectionId = PLAID_ENABLED && ownerId ? rememberedPlaidConnection(ownerId) : null
  const candidates = useMemo(
    () => (resource.data?.candidates ?? []).filter((item) => !item.removed_at),
    [resource.data?.candidates],
  )

  const connect = async () => {
    setWorking(true)
    setFeedback({})
    try {
      const result = await invokePlaidFunction<LinkTokenResponse>('create_link_token')
      shouldOpen.current = true
      setLinkToken(result.linkToken)
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not start Plaid Link.' })
    } finally {
      setWorking(false)
    }
  }

  const sync = async () => {
    if (!connectionId) {
      setFeedback({ error: 'Reconnect the institution to restore its sync reference.' })
      return
    }
    setWorking(true)
    setFeedback({})
    try {
      await invokePlaidFunction('sync', { connectionId })
      setFeedback({ success: 'Latest read-only transactions synced.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not sync transactions.' })
    } finally {
      setWorking(false)
    }
  }

  const disconnect = async () => {
    if (!connectionId) return
    setWorking(true)
    setFeedback({})
    try {
      await invokePlaidFunction('disconnect', { connectionId })
      forgetPlaidConnection(ownerId!)
      setFeedback({ success: 'Institution disconnected. Existing ledger entries were not changed.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not disconnect institution.' })
    } finally {
      setWorking(false)
    }
  }

  const markCandidate = async (
    candidateId: string,
    status: 'matched' | 'ignored',
  ) => {
    if (!ownerId) return
    const ledgerId = status === 'matched' ? selectedLedger[candidateId] : null
    if (status === 'matched' && !ledgerId) {
      setFeedback({ error: 'Choose an existing ledger entry to confirm a match.' })
      return
    }
    try {
      await updatePlaidCandidate(ownerId, candidateId, status, ledgerId)
      setFeedback({
        success:
          status === 'matched'
            ? 'Candidate matched to the selected ledger entry.'
            : 'Candidate ignored. The bankroll ledger was not changed.',
      })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not update candidate.' })
    }
  }

  if (!PLAID_ENABLED) {
    return (
      <ProPage
        title="Bank reconciliation"
        description="Optional read-only bank matching is off until the client explicitly enables Plaid."
      >
        <Card className="border-gold/30 bg-gold/5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-ink">Plaid disabled</h2>
              <p className="mt-1 text-sm text-muted">
                Bank data is not connected. When enabled, Transactions imports remain reconciliation
                candidates and never post, edit, or transfer bankroll funds automatically.
              </p>
            </div>
          </div>
        </Card>
      </ProPage>
    )
  }

  return (
    <ProPage
      title="Bank reconciliation"
      description="Use read-only Plaid Transactions candidates to confirm records already posted to the bankroll ledger."
      actions={
        <>
          <Button size="sm" className="gap-2 bg-white text-poker-green hover:bg-cream" disabled={working} onClick={() => void sync()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Sync
          </Button>
          <Button size="sm" className="gap-2 bg-white text-poker-green hover:bg-cream" disabled={working || Boolean(plaidScriptError)} onClick={() => void connect()}>
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Connect
          </Button>
        </>
      }
    >
      <FormFeedback {...feedback} error={feedback.error || plaidScriptError?.message} />
      {resource.loading ? <ProLoading label="Loading reconciliation candidates…" /> : null}
      {resource.error ? <ProError error={resource.error} retry={resource.reload} /> : null}
      {resource.data?.status ? (
        <Card className="border-poker-green/20 bg-poker-green/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Landmark className="mt-0.5 h-5 w-5 text-poker-green" aria-hidden="true" />
              <div>
                <h2 className="font-semibold text-ink">Read-only Transactions</h2>
                <p className="text-sm text-muted">
                  {resource.data.status.environment} environment · no Transfer, ACH, Payment
                  Initiation, or automatic ledger posting.
                </p>
              </div>
            </div>
            {connectionId ? (
              <Button size="sm" variant="ghost" className="gap-1.5" disabled={working} onClick={() => void disconnect()}>
                <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
                Disconnect
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Reconciliation candidates</CardTitle>
          <p className="text-sm text-muted">
            Matching changes only the candidate’s review state; the selected ledger entry remains immutable.
          </p>
        </CardHeader>
        <CardContent>
          {candidates.length ? (
            <div className="divide-y divide-border">
              {candidates.map((candidate) => (
                <article className="grid gap-3 py-4 first:pt-0 last:pb-0 lg:grid-cols-[1fr_auto] lg:items-center" key={candidate.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-ink">{candidate.name}</h2>
                      <Badge variant={candidate.pending ? 'gold' : candidate.match_status === 'matched' ? 'green' : 'default'}>
                        {candidate.pending ? 'pending bank item' : candidate.match_status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">{formatDate(candidate.date)} · Account ending/reference {candidate.account_id.slice(-4)}</p>
                    <p className="mt-1 font-bold tabular-nums text-ink">{formatMinor(candidate.amount_minor, candidate.currency)}</p>
                  </div>
                  {candidate.match_status === 'unreviewed' ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <FormSelect
                        aria-label={`Ledger match for ${candidate.name}`}
                        value={selectedLedger[candidate.id] ?? ''}
                        onChange={(event) =>
                          setSelectedLedger((values) => ({
                            ...values,
                            [candidate.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Choose ledger entry</option>
                        {(resource.data?.ledger ?? [])
                          .filter((entry) => entry.currency === candidate.currency)
                          .map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {formatDate(entry.occurred_at)} · {entry.description} · {formatMinor(entry.amount_minor, entry.currency)}
                            </option>
                          ))}
                      </FormSelect>
                      <Button size="sm" onClick={() => void markCandidate(candidate.id, 'matched')}>Confirm match</Button>
                      <Button size="sm" variant="ghost" onClick={() => void markCandidate(candidate.id, 'ignored')}>Ignore</Button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <ProEmpty
              title="No reconciliation candidates"
              description={connectionId ? 'Sync to check for added, modified, pending, or removed transactions.' : 'Connect a read-only institution to import candidates.'}
              action={connectionId ? <Button onClick={() => void sync()}>Sync transactions</Button> : <Button onClick={() => void connect()}>Connect institution</Button>}
            />
          )}
        </CardContent>
      </Card>
    </ProPage>
  )
}
