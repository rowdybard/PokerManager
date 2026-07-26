import { useMemo, useState, type FormEvent } from 'react'
import { ArrowDownRight, ArrowUpRight, Plus, RotateCcw, WalletCards, X } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import {
  Field,
  FormFeedback,
  FormInput,
  FormSelect,
  MoneyField,
  ProEmpty,
  ProError,
  ProLoading,
  ProPage,
  useProResource,
} from '../../components/pro'
import { useAuthStore } from '../../store/authStore'
import {
  createBankrollAccount,
  decimalToMinor,
  formatDateTime,
  formatMinor,
  getAccountBalance,
  listBankrollAccounts,
  listLedgerEntries,
  localDateTimeInputValue,
  postLedgerEntry,
  reverseLedgerEntry,
  type BankrollAccount,
  type LedgerEntry,
} from '../../lib/pro'
import { cn } from '../../lib/utils'

const debitTypes = new Set<LedgerEntry['entry_type']>(['withdrawal', 'buy_in', 'expense'])

function loadBankroll(ownerId: string) {
  return Promise.all([listBankrollAccounts(ownerId), listLedgerEntries(ownerId)]).then(
    ([accounts, entries]) => ({ accounts, entries }),
  )
}

export function BankrollPage() {
  const ownerId = useAuthStore((state) => state.user?.id)
  const resource = useProResource(['pro', 'bankroll', ownerId], () => {
    if (!ownerId) throw new Error('Sign in to view bankroll accounts.')
    return loadBankroll(ownerId)
  })
  const [panel, setPanel] = useState<'account' | 'entry' | null>(null)
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [account, setAccount] = useState({
    name: '',
    accountType: 'cash' as BankrollAccount['account_type'],
    currency: 'USD',
    openingBalance: '0',
  })
  const [entry, setEntry] = useState({
    accountId: '',
    type: 'deposit' as LedgerEntry['entry_type'],
    amount: '',
    occurredAt: localDateTimeInputValue(),
    description: '',
    reference: '',
  })
  const [reverseTarget, setReverseTarget] = useState<LedgerEntry | null>(null)
  const [reverseReason, setReverseReason] = useState('')

  const accountsById = useMemo(
    () => new Map((resource.data?.accounts ?? []).map((item) => [item.id, item])),
    [resource.data?.accounts],
  )

  const saveAccount = async (event: FormEvent) => {
    event.preventDefault()
    if (!ownerId) return
    setSubmitting(true)
    setFeedback({})
    try {
      await createBankrollAccount(ownerId, {
        name: account.name.trim(),
        account_type: account.accountType,
        currency: account.currency,
        opening_balance_minor: decimalToMinor(account.openingBalance || '0', account.currency),
      })
      setAccount({ name: '', accountType: 'cash', currency: 'USD', openingBalance: '0' })
      setPanel(null)
      setFeedback({ success: 'Bankroll account created.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not create account.' })
    } finally {
      setSubmitting(false)
    }
  }

  const saveEntry = async (event: FormEvent) => {
    event.preventDefault()
    if (!ownerId) return
    const selectedAccount = accountsById.get(entry.accountId)
    if (!selectedAccount) {
      setFeedback({ error: 'Choose a bankroll account.' })
      return
    }
    setSubmitting(true)
    setFeedback({})
    try {
      let amountMinor = BigInt(
        decimalToMinor(entry.amount || '0', selectedAccount.currency),
      )
      if (debitTypes.has(entry.type) && amountMinor > 0n) amountMinor = -amountMinor
      if (!debitTypes.has(entry.type) && entry.type !== 'adjustment' && amountMinor < 0n) {
        amountMinor = -amountMinor
      }
      if (amountMinor === 0n) throw new Error('Ledger amount cannot be zero.')
      await postLedgerEntry(ownerId, {
        account_id: selectedAccount.id,
        entry_type: entry.type,
        amount_minor: amountMinor.toString(),
        currency: selectedAccount.currency,
        occurred_at: new Date(entry.occurredAt).toISOString(),
        description: entry.description.trim(),
        external_reference: entry.reference.trim() || null,
        idempotency_key: crypto.randomUUID(),
      })
      setEntry({
        accountId: selectedAccount.id,
        type: 'deposit',
        amount: '',
        occurredAt: localDateTimeInputValue(),
        description: '',
        reference: '',
      })
      setPanel(null)
      setFeedback({ success: 'Append-only ledger entry posted.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not post entry.' })
    } finally {
      setSubmitting(false)
    }
  }

  const reverse = async (event: FormEvent) => {
    event.preventDefault()
    if (!ownerId || !reverseTarget) return
    setSubmitting(true)
    setFeedback({})
    try {
      await reverseLedgerEntry(ownerId, reverseTarget.id, reverseReason.trim())
      setReverseTarget(null)
      setReverseReason('')
      setFeedback({ success: 'A linked reversal was posted. The original entry is unchanged.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not reverse entry.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProPage
      title="Bankroll"
      description="Track exact balances with append-only entries. Poker Manager records activity but never holds or moves money."
      actions={
        <>
          <Button
            size="sm"
            className="gap-2 bg-white text-poker-green hover:bg-cream"
            onClick={() => setPanel(panel === 'entry' ? null : 'entry')}
            disabled={(resource.data?.accounts.length ?? 0) === 0}
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            Post entry
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-white text-poker-green hover:bg-cream"
            onClick={() => setPanel(panel === 'account' ? null : 'account')}
          >
            {panel === 'account' ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            Account
          </Button>
        </>
      }
    >
      <FormFeedback {...feedback} />
      {panel === 'account' ? (
        <Card>
          <CardHeader>
            <CardTitle>New bankroll account</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={saveAccount}>
              <Field label="Account name" required>
                <FormInput
                  required
                  maxLength={100}
                  value={account.name}
                  onChange={(event) => setAccount((value) => ({ ...value, name: event.target.value }))}
                />
              </Field>
              <Field label="Type" required>
                <FormSelect
                  value={account.accountType}
                  onChange={(event) =>
                    setAccount((value) => ({
                      ...value,
                      accountType: event.target.value as BankrollAccount['account_type'],
                    }))
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="online">Online site</option>
                  <option value="other">Other</option>
                </FormSelect>
              </Field>
              <Field label="Currency" required>
                <FormInput
                  required
                  minLength={3}
                  maxLength={3}
                  value={account.currency}
                  onChange={(event) =>
                    setAccount((value) => ({ ...value, currency: event.target.value.toUpperCase() }))
                  }
                />
              </Field>
              <MoneyField
                label="Opening balance"
                allowNegative
                currency={account.currency}
                value={account.openingBalance}
                onChange={(openingBalance) => setAccount((value) => ({ ...value, openingBalance }))}
              />
              <div className="flex justify-end sm:col-span-2 lg:col-span-4">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create account'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {panel === 'entry' ? (
        <Card>
          <CardHeader>
            <CardTitle>Post ledger entry</CardTitle>
            <p className="text-sm text-muted">
              Buy-ins, withdrawals, and expenses subtract automatically. Adjustments keep the sign entered.
            </p>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={saveEntry}>
              <Field label="Account" required>
                <FormSelect
                  required
                  value={entry.accountId}
                  onChange={(event) => setEntry((value) => ({ ...value, accountId: event.target.value }))}
                >
                  <option value="">Choose account</option>
                  {(resource.data?.accounts ?? []).filter((item) => !item.is_archived).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.currency}
                    </option>
                  ))}
                </FormSelect>
              </Field>
              <Field label="Entry type" required>
                <FormSelect
                  value={entry.type}
                  onChange={(event) =>
                    setEntry((value) => ({
                      ...value,
                      type: event.target.value as LedgerEntry['entry_type'],
                    }))
                  }
                >
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                  <option value="buy_in">Buy-in</option>
                  <option value="cash_out">Cash-out</option>
                  <option value="expense">Expense</option>
                  <option value="winnings">Winnings</option>
                  <option value="adjustment">Adjustment</option>
                </FormSelect>
              </Field>
              <MoneyField
                label="Amount"
                required
                allowNegative={entry.type === 'adjustment'}
                currency={accountsById.get(entry.accountId)?.currency ?? 'USD'}
                value={entry.amount}
                onChange={(amount) => setEntry((value) => ({ ...value, amount }))}
              />
              <Field label="Occurred at" required>
                <FormInput
                  type="datetime-local"
                  required
                  value={entry.occurredAt}
                  onChange={(event) => setEntry((value) => ({ ...value, occurredAt: event.target.value }))}
                />
              </Field>
              <Field label="Description" required>
                <FormInput
                  required
                  maxLength={250}
                  value={entry.description}
                  onChange={(event) =>
                    setEntry((value) => ({ ...value, description: event.target.value }))
                  }
                />
              </Field>
              <Field label="External reference">
                <FormInput
                  maxLength={200}
                  value={entry.reference}
                  onChange={(event) => setEntry((value) => ({ ...value, reference: event.target.value }))}
                />
              </Field>
              <div className="flex justify-end sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Posting…' : 'Post immutable entry'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {reverseTarget ? (
        <Card className="border-gold/30">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={reverse}>
            <div className="min-w-0 flex-1">
              <Field label={`Reason for reversing ${reverseTarget.description}`} required>
                <FormInput
                  required
                  maxLength={250}
                  value={reverseReason}
                  onChange={(event) => setReverseReason(event.target.value)}
                />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setReverseTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                Post reversal
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {resource.loading ? <ProLoading label="Loading bankroll…" /> : null}
      {resource.error ? <ProError error={resource.error} retry={resource.reload} /> : null}
      {resource.data ? (
        <>
          <section aria-label="Bankroll accounts" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {resource.data.accounts.map((item) => (
              <Card key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {item.account_type}
                    </p>
                    <h2 className="mt-1 font-semibold text-ink">{item.name}</h2>
                  </div>
                  {item.is_archived ? <Badge>Archived</Badge> : <WalletCards className="h-5 w-5 text-gold" />}
                </div>
                <p className="mt-5 text-2xl font-bold tabular-nums text-ink">
                  {formatMinor(getAccountBalance(item, resource.data!.entries), item.currency)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Opened at {formatMinor(item.opening_balance_minor, item.currency)}
                </p>
              </Card>
            ))}
            {resource.data.accounts.length === 0 ? (
              <div className="sm:col-span-2 xl:col-span-4">
                <ProEmpty
                  title="No bankroll accounts"
                  description="Create a cash, bank, or online account before posting ledger activity."
                  action={<Button onClick={() => setPanel('account')}>Create account</Button>}
                />
              </div>
            ) : null}
          </section>

          {resource.data.accounts.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Append-only ledger</CardTitle>
                <p className="text-sm text-muted">
                  Corrections post linked reversals; original entries cannot be edited or deleted.
                </p>
              </CardHeader>
              <CardContent>
                {resource.data.entries.length ? (
                  <div className="divide-y divide-border">
                    {resource.data.entries.map((item) => {
                      const accountName = accountsById.get(item.account_id)?.name ?? 'Account'
                      const positive = BigInt(item.amount_minor) > 0n
                      const alreadyReversed = resource.data!.entries.some(
                        (candidate) => candidate.reversal_of_id === item.id,
                      )
                      return (
                        <article
                          key={item.id}
                          className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                        >
                          <span
                            className={cn(
                              'hidden rounded-full p-2 sm:block',
                              positive ? 'bg-poker-green/10 text-success' : 'bg-danger/10 text-danger',
                            )}
                          >
                            {positive ? (
                              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-sm font-semibold text-ink">{item.description}</h3>
                              <Badge variant={item.entry_type === 'reversal' ? 'gold' : 'default'}>
                                {item.entry_type.replaceAll('_', ' ')}
                              </Badge>
                              {alreadyReversed ? <Badge variant="red">Reversed</Badge> : null}
                            </div>
                            <p className="mt-0.5 text-xs text-muted">
                              {accountName} · {formatDateTime(item.occurred_at)}
                              {item.external_reference ? ` · ${item.external_reference}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <p
                              className={cn(
                                'font-bold tabular-nums',
                                positive ? 'text-success' : 'text-danger',
                              )}
                            >
                              {formatMinor(item.amount_minor, item.currency)}
                            </p>
                            {item.entry_type !== 'reversal' && !alreadyReversed ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1"
                                onClick={() => setReverseTarget(item)}
                              >
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                                Reverse
                              </Button>
                            ) : null}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted">No ledger entries yet.</p>
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </ProPage>
  )
}
