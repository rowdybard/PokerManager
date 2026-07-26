import { useMemo, useRef, useState, type FormEvent } from 'react'
import { FileText, Paperclip, Plane, Plus, ReceiptText, X } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import {
  Field,
  FormFeedback,
  FormInput,
  FormSelect,
  FormTextarea,
  MoneyField,
  ProEmpty,
  ProError,
  ProLoading,
  ProPage,
  useProResource,
} from '../../components/pro'
import { useAuthStore } from '../../store/authStore'
import {
  createCareerExpense,
  createTrip,
  decimalToMinor,
  formatDate,
  formatMinor,
  getPrivateDocumentUrl,
  listCareerExpenses,
  listTrips,
  sumMinor,
  todayInputValue,
  uploadExpenseReceipt,
  type CareerExpense,
} from '../../lib/pro'

function loadTravel(ownerId: string) {
  return Promise.all([listTrips(ownerId), listCareerExpenses(ownerId)]).then(
    ([trips, expenses]) => ({ trips, expenses }),
  )
}

export function TravelExpensesPage() {
  const ownerId = useAuthStore((state) => state.user?.id)
  const resource = useProResource(['pro', 'travel', ownerId], () => {
    if (!ownerId) throw new Error('Sign in to view trips and expenses.')
    return loadTravel(ownerId)
  })
  const [panel, setPanel] = useState<'trip' | 'expense' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({})
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [trip, setTrip] = useState({
    name: '',
    destination: '',
    startsOn: todayInputValue(),
    endsOn: '',
    budget: '',
    currency: 'USD',
    notes: '',
  })
  const [expense, setExpense] = useState({
    tripId: '',
    category: 'travel' as CareerExpense['category'],
    merchant: '',
    amount: '',
    currency: 'USD',
    incurredOn: todayInputValue(),
    deductible: false,
    notes: '',
  })

  const tripSpend = useMemo(() => {
    const grouped = new Map<string, string>()
    for (const item of resource.data?.expenses ?? []) {
      if (!item.trip_id) continue
      grouped.set(item.trip_id, sumMinor([grouped.get(item.trip_id) ?? '0', item.amount_minor]))
    }
    return grouped
  }, [resource.data?.expenses])

  const saveTrip = async (event: FormEvent) => {
    event.preventDefault()
    if (!ownerId) return
    setSubmitting(true)
    setFeedback({})
    try {
      await createTrip(ownerId, {
        name: trip.name.trim(),
        destination: trip.destination.trim() || null,
        starts_on: trip.startsOn,
        ends_on: trip.endsOn || null,
        budget_minor: trip.budget ? decimalToMinor(trip.budget, trip.currency) : null,
        currency: trip.currency,
        notes: trip.notes.trim() || null,
      })
      setTrip({
        name: '',
        destination: '',
        startsOn: todayInputValue(),
        endsOn: '',
        budget: '',
        currency: 'USD',
        notes: '',
      })
      setPanel(null)
      setFeedback({ success: 'Trip created.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not create trip.' })
    } finally {
      setSubmitting(false)
    }
  }

  const saveExpense = async (event: FormEvent) => {
    event.preventDefault()
    if (!ownerId) return
    setSubmitting(true)
    setFeedback({})
    try {
      await createCareerExpense(ownerId, {
        trip_id: expense.tripId || null,
        session_id: null,
        category: expense.category,
        merchant: expense.merchant.trim() || null,
        amount_minor: decimalToMinor(expense.amount, expense.currency),
        currency: expense.currency,
        incurred_on: expense.incurredOn,
        deductible: expense.deductible,
        notes: expense.notes.trim() || null,
      })
      setExpense({
        tripId: expense.tripId,
        category: 'travel',
        merchant: '',
        amount: '',
        currency: 'USD',
        incurredOn: todayInputValue(),
        deductible: false,
        notes: '',
      })
      setPanel(null)
      setFeedback({ success: 'Expense recorded. Add a receipt from the expense list if needed.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not record expense.' })
    } finally {
      setSubmitting(false)
    }
  }

  const selectReceipt = (expenseId: string) => {
    setUploadingId(expenseId)
    fileInput.current?.click()
  }

  const uploadReceipt = async (file: File | undefined) => {
    if (!ownerId || !uploadingId || !file) return
    setSubmitting(true)
    setFeedback({})
    try {
      await uploadExpenseReceipt(ownerId, uploadingId, file)
      setFeedback({ success: 'Private receipt attached.' })
      await resource.reload()
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not upload receipt.' })
    } finally {
      setSubmitting(false)
      setUploadingId(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const viewReceipt = async (path: string) => {
    try {
      const url = await getPrivateDocumentUrl(path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setFeedback({ error: error instanceof Error ? error.message : 'Could not open receipt.' })
    }
  }

  return (
    <ProPage
      title="Travel & expenses"
      description="Plan poker trips, capture business costs, and keep private receipt evidence ready for reports."
      actions={
        <>
          <Button
            size="sm"
            className="gap-2 bg-white text-poker-green hover:bg-cream"
            onClick={() => setPanel(panel === 'expense' ? null : 'expense')}
          >
            <ReceiptText className="h-4 w-4" aria-hidden="true" />
            Expense
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-white text-poker-green hover:bg-cream"
            onClick={() => setPanel(panel === 'trip' ? null : 'trip')}
          >
            {panel === 'trip' ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            Trip
          </Button>
        </>
      }
    >
      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(event) => void uploadReceipt(event.target.files?.[0])}
      />
      <FormFeedback {...feedback} />

      {panel === 'trip' ? (
        <Card>
          <CardHeader><CardTitle>New poker trip</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveTrip}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Trip name" required>
                  <FormInput
                    required
                    value={trip.name}
                    onChange={(event) => setTrip((value) => ({ ...value, name: event.target.value }))}
                  />
                </Field>
                <Field label="Destination">
                  <FormInput
                    value={trip.destination}
                    onChange={(event) => setTrip((value) => ({ ...value, destination: event.target.value }))}
                  />
                </Field>
                <Field label="Starts" required>
                  <FormInput
                    required
                    type="date"
                    value={trip.startsOn}
                    onChange={(event) => setTrip((value) => ({ ...value, startsOn: event.target.value }))}
                  />
                </Field>
                <Field label="Ends">
                  <FormInput
                    type="date"
                    min={trip.startsOn}
                    value={trip.endsOn}
                    onChange={(event) => setTrip((value) => ({ ...value, endsOn: event.target.value }))}
                  />
                </Field>
                <Field label="Currency" required>
                  <FormInput
                    required
                    minLength={3}
                    maxLength={3}
                    value={trip.currency}
                    onChange={(event) =>
                      setTrip((value) => ({ ...value, currency: event.target.value.toUpperCase() }))
                    }
                  />
                </Field>
                <MoneyField
                  label="Budget"
                  currency={trip.currency}
                  value={trip.budget}
                  onChange={(budget) => setTrip((value) => ({ ...value, budget }))}
                />
                <div className="sm:col-span-2">
                  <Field label="Private notes">
                    <FormTextarea
                      value={trip.notes}
                      onChange={(event) => setTrip((value) => ({ ...value, notes: event.target.value }))}
                    />
                  </Field>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create trip'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {panel === 'expense' ? (
        <Card>
          <CardHeader><CardTitle>Record expense</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveExpense}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Trip">
                  <FormSelect
                    value={expense.tripId}
                    onChange={(event) =>
                      setExpense((value) => ({ ...value, tripId: event.target.value }))
                    }
                  >
                    <option value="">No trip</option>
                    {(resource.data?.trips ?? []).map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </FormSelect>
                </Field>
                <Field label="Category" required>
                  <FormSelect
                    value={expense.category}
                    onChange={(event) =>
                      setExpense((value) => ({
                        ...value,
                        category: event.target.value as CareerExpense['category'],
                      }))
                    }
                  >
                    <option value="travel">Travel</option>
                    <option value="lodging">Lodging</option>
                    <option value="meal">Meal</option>
                    <option value="entry_fee">Entry fee</option>
                    <option value="study">Study</option>
                    <option value="equipment">Equipment</option>
                    <option value="other">Other</option>
                  </FormSelect>
                </Field>
                <Field label="Merchant">
                  <FormInput
                    value={expense.merchant}
                    onChange={(event) =>
                      setExpense((value) => ({ ...value, merchant: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Date" required>
                  <FormInput
                    required
                    type="date"
                    value={expense.incurredOn}
                    onChange={(event) =>
                      setExpense((value) => ({ ...value, incurredOn: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Currency" required>
                  <FormInput
                    required
                    minLength={3}
                    maxLength={3}
                    value={expense.currency}
                    onChange={(event) =>
                      setExpense((value) => ({ ...value, currency: event.target.value.toUpperCase() }))
                    }
                  />
                </Field>
                <MoneyField
                  required
                  currency={expense.currency}
                  value={expense.amount}
                  onChange={(amount) => setExpense((value) => ({ ...value, amount }))}
                />
                <Field label="Tax treatment">
                  <label className="flex h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={expense.deductible}
                      onChange={(event) =>
                        setExpense((value) => ({ ...value, deductible: event.target.checked }))
                      }
                    />
                    Mark deductible
                  </label>
                </Field>
                <Field label="Private notes">
                  <FormInput
                    value={expense.notes}
                    onChange={(event) => setExpense((value) => ({ ...value, notes: event.target.value }))}
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save expense'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {resource.loading ? <ProLoading label="Loading travel records…" /> : null}
      {resource.error ? <ProError error={resource.error} retry={resource.reload} /> : null}
      {resource.data ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_1.35fr]">
          <Card>
            <CardHeader>
              <CardTitle>Trips</CardTitle>
            </CardHeader>
            <CardContent>
              {resource.data.trips.length ? (
                <div className="space-y-3">
                  {resource.data.trips.map((item) => {
                    const spend = tripSpend.get(item.id) ?? '0'
                    return (
                      <article className="rounded-xl border border-border p-4" key={item.id}>
                        <div className="flex items-start gap-3">
                          <Plane className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <h2 className="font-semibold text-ink">{item.name}</h2>
                            <p className="text-xs text-muted">
                              {formatDate(item.starts_on)}
                              {item.ends_on ? ` – ${formatDate(item.ends_on)}` : ''}
                              {item.destination ? ` · ${item.destination}` : ''}
                            </p>
                            <p className="mt-2 text-sm tabular-nums text-ink">
                              Spent <strong>{formatMinor(spend, item.currency)}</strong>
                              {item.budget_minor
                                ? ` of ${formatMinor(item.budget_minor, item.currency)}`
                                : ''}
                            </p>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <ProEmpty
                  title="No trips"
                  description="Create a trip to group tournament travel, lodging, meals, and receipts."
                  action={<Button onClick={() => setPanel('trip')}>Create trip</Button>}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense register</CardTitle>
            </CardHeader>
            <CardContent>
              {resource.data.expenses.length ? (
                <div className="divide-y divide-border">
                  {resource.data.expenses.map((item) => {
                    const tripName = resource.data!.trips.find((tripItem) => tripItem.id === item.trip_id)?.name
                    return (
                      <article
                        className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center"
                        key={item.id}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-semibold text-ink">{item.merchant || item.category.replace('_', ' ')}</h2>
                            <Badge>{item.category.replace('_', ' ')}</Badge>
                            {item.deductible ? <Badge variant="green">Deductible</Badge> : null}
                          </div>
                          <p className="mt-1 text-xs text-muted">
                            {formatDate(item.incurred_on)}
                            {tripName ? ` · ${tripName}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <p className="font-bold tabular-nums text-ink">
                            {formatMinor(item.amount_minor, item.currency)}
                          </p>
                          {item.receipt_path ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1"
                              onClick={() => void viewReceipt(item.receipt_path!)}
                            >
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              Receipt
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1"
                              disabled={submitting && uploadingId === item.id}
                              onClick={() => selectReceipt(item.id)}
                            >
                              <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                              Attach
                            </Button>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <ProEmpty
                  title="No expenses"
                  description="Record travel, lodging, meals, entries, study, or equipment costs."
                  action={<Button onClick={() => setPanel('expense')}>Record expense</Button>}
                />
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </ProPage>
  )
}
