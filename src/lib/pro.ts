import { supabase } from './supabase'
import { env } from './env'

export type CurrencyCode = string
export type CareerSessionKind = 'cash' | 'tournament'
export type SessionMedium = 'live' | 'online'
export type SettlementStatus = 'pending' | 'paid' | 'disputed' | 'void'
export type DataQuality = 'trusted' | 'legacy_incomplete'

export interface Money {
  amountMinor: string
  currency: CurrencyCode
}

export interface CareerSession {
  id: string
  owner_id: string
  session_kind: CareerSessionKind
  medium: SessionMedium
  played_at: string
  ended_at: string | null
  venue: string | null
  game_variant: string
  stakes: string | null
  duration_minutes: number | null
  hands_played: number | null
  entries: number
  buy_in_minor: string
  fees_minor: string
  payout_minor: string
  profit_minor: string
  currency: CurrencyCode
  timezone: string
  notes: string | null
  tags: string[]
  data_quality: DataQuality
  created_at: string
}

export interface BankrollAccount {
  id: string
  owner_id: string
  name: string
  account_type: 'cash' | 'bank' | 'online' | 'other'
  currency: CurrencyCode
  opening_balance_minor: string
  is_archived: boolean
  created_at: string
}

export interface LedgerEntry {
  id: string
  owner_id: string
  account_id: string
  session_id: string | null
  settlement_id: string | null
  entry_type:
    | 'deposit'
    | 'withdrawal'
    | 'buy_in'
    | 'cash_out'
    | 'expense'
    | 'winnings'
    | 'transfer'
    | 'adjustment'
    | 'reversal'
  amount_minor: string
  currency: CurrencyCode
  occurred_at: string
  description: string
  external_reference: string | null
  reversal_of_id: string | null
  idempotency_key: string
  created_at: string
}

export interface Settlement {
  id: string
  owner_id: string
  session_id: string | null
  direction: 'payable' | 'receivable'
  counterparty: string
  amount_minor: string
  currency: CurrencyCode
  reason: string
  external_method: string | null
  external_handle: string | null
  provider_url: string | null
  memo: string | null
  due_date: string | null
  status: SettlementStatus
  paid_at: string | null
  confirmation_path: string | null
  revision: number
  created_at: string
  updated_at: string
}

export interface PokerTrip {
  id: string
  owner_id: string
  name: string
  destination: string | null
  starts_on: string
  ends_on: string | null
  budget_minor: string | null
  currency: CurrencyCode
  notes: string | null
  created_at: string
}

export interface CareerExpense {
  id: string
  owner_id: string
  trip_id: string | null
  session_id: string | null
  category: 'travel' | 'lodging' | 'meal' | 'entry_fee' | 'study' | 'equipment' | 'other'
  merchant: string | null
  amount_minor: string
  currency: CurrencyCode
  incurred_on: string
  deductible: boolean
  notes: string | null
  receipt_path: string | null
  created_at: string
}

export interface StakingDeal {
  id: string
  owner_id: string
  backer_name: string
  name: string
  player_share_bps: number
  backer_share_bps: number
  markup_bps: number
  makeup_minor: string
  currency: CurrencyCode
  starts_on: string
  ends_on: string | null
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
}

export interface StakingAllocation {
  id: string
  owner_id: string
  deal_id: string
  session_id: string
  allocated_buy_in_minor: string
  backer_result_minor: string
  player_result_minor: string
  settled_at: string | null
  notes: string | null
  created_at: string
}

export interface StakingAllocationResult {
  allocation: StakingAllocation
  deal: StakingDeal
  makeup_before_minor: string
  makeup_after_minor: string
}

export interface ProfessionalCalendarEvent {
  id: string
  owner_id: string
  session_id: string | null
  trip_id: string | null
  title: string
  event_type: 'session' | 'tournament' | 'series' | 'registration' | 'travel' | 'study' | 'other'
  starts_at: string
  ends_at: string | null
  timezone: string
  location: string | null
  exposure_minor: string | null
  currency: CurrencyCode
  notes: string | null
  created_at: string
}

export interface PokerHand {
  id: string
  owner_id: string
  session_id: string | null
  played_at: string
  source: 'manual' | 'import'
  game_variant: string
  stakes: string | null
  position: string | null
  hero_cards: string | null
  board: string | null
  pot_minor: string | null
  result_minor: string | null
  currency: CurrencyCode
  opponent_aliases: string[]
  tags: string[]
  hand_history: string
  notes: string | null
  review_status: 'queued' | 'reviewed' | 'archived'
  created_at: string
}

export interface StudySession {
  id: string
  owner_id: string
  studied_at: string
  duration_minutes: number
  topic: string
  resource: string | null
  notes: string | null
  created_at: string
}

export interface CareerGoal {
  id: string
  owner_id: string
  title: string
  metric: string | null
  target_value: string | null
  current_value: string | null
  starts_on: string
  due_on: string | null
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  notes: string | null
  created_at: string
}

export interface PlaidCandidate {
  id: string
  owner_id: string
  connection_id: string
  plaid_transaction_id: string
  account_id: string
  name: string
  amount_minor: string
  currency: CurrencyCode
  date: string
  pending: boolean
  removed_at: string | null
  match_status: 'unreviewed' | 'matched' | 'ignored'
  matched_ledger_entry_id: string | null
  created_at: string
  updated_at: string
}

export interface PlaidConnection {
  id: string
  institution_name: string | null
  status: 'active' | 'login_required' | 'error' | 'disconnected'
  created_at: string
  updated_at: string
}

export interface PlaidStatus {
  enabled: true
  environment: 'sandbox' | 'development' | 'production'
  readOnly: true
  connections: PlaidConnection[]
}

export interface CareerSessionInput {
  session_kind: CareerSessionKind
  medium: SessionMedium
  played_at: string
  ended_at?: string | null
  venue?: string | null
  game_variant: string
  stakes?: string | null
  duration_minutes?: number | null
  hands_played?: number | null
  entries: number
  buy_in_minor: string
  fees_minor: string
  payout_minor: string
  currency: CurrencyCode
  timezone: string
  notes?: string | null
  tags?: string[]
  data_quality?: DataQuality
}

export interface SettlementInput {
  session_id?: string | null
  direction: Settlement['direction']
  counterparty: string
  amount_minor: string
  currency: CurrencyCode
  reason: string
  external_method?: string | null
  external_handle?: string | null
  memo?: string | null
  due_date?: string | null
  idempotency_key: string
}

export interface DashboardData {
  sessions: CareerSession[]
  accounts: BankrollAccount[]
  ledger: LedgerEntry[]
  goals: CareerGoal[]
  upcomingEvents: ProfessionalCalendarEvent[]
}

export interface CareerMetrics {
  totalProfitMinor: string
  totalInvestedMinor: string
  totalPayoutMinor: string
  cashProfitMinor: string
  tournamentProfitMinor: string
  bankrollMinor: string
  totalMinutes: number
  totalHands: number
  sessionCount: number
  tournamentCount: number
  tournamentCashes: number
  tournamentEntries: number
  roiPercent: number | null
  hourlyMinor: string | null
  bbPer100: number | null
  bbPerHour: number | null
  abiMinor: string | null
  drawdownMinor: string
  currency: CurrencyCode
}

type QueryError = { message?: string; details?: string; hint?: string; code?: string }

const CURRENCY_MINOR_DIGITS: Record<string, number> = {
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  UYU: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
}

export const PRO_ROUTES = [
  { path: '/pro', label: 'Overview' },
  { path: '/pro/sessions', label: 'Sessions' },
  { path: '/pro/bankroll', label: 'Bankroll' },
  { path: '/pro/settlements', label: 'Settlements' },
  { path: '/pro/travel', label: 'Travel & expenses' },
  { path: '/pro/staking', label: 'Staking' },
  { path: '/pro/calendar', label: 'Calendar' },
  { path: '/pro/study', label: 'Study' },
  { path: '/pro/exports', label: 'Exports' },
  { path: '/pro/reconciliation', label: 'Reconciliation' },
] as const

export const PLAID_ENABLED = env.plaidEnabled

function assertOwnerId(ownerId: string): void {
  if (!ownerId || ownerId.length < 20) {
    throw new Error('A signed-in owner is required.')
  }
}

function throwIfError(error: QueryError | null): void {
  if (!error) return
  const details = [error.message, error.details, error.hint].filter(Boolean).join(' ')
  throw new Error(details || 'The database request failed.')
}

const DATABASE_PAGE_SIZE = 1_000

async function collectQueryPages<Row>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: Row[] | null; error: QueryError | null }>,
  maximum?: number,
): Promise<Row[]> {
  if (maximum !== undefined && (!Number.isSafeInteger(maximum) || maximum < 0)) {
    throw new Error('The requested record limit is invalid.')
  }
  if (maximum === 0) return []

  const rows: Row[] = []
  while (maximum === undefined || rows.length < maximum) {
    const remaining = maximum === undefined ? DATABASE_PAGE_SIZE : maximum - rows.length
    const pageSize = Math.min(DATABASE_PAGE_SIZE, remaining)
    const { data, error } = await fetchPage(rows.length, rows.length + pageSize - 1)
    throwIfError(error)
    const page = data ?? []
    rows.push(...page)
    if (page.length < pageSize) break
  }
  return rows
}

function normalizeCurrency(currency: string): CurrencyCode {
  const normalized = currency.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error('Currency must be a three-letter ISO code.')
  }
  return normalized
}

function exactMinorValue(value: unknown, field: string): string {
  if (typeof value === 'string') return normalizeMinor(value)
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value)
  throw new Error(`${field} could not be represented exactly in this browser.`)
}

function optionalExactMinorValue(value: unknown, field: string): string | null {
  return value === null || value === undefined ? null : exactMinorValue(value, field)
}

function normalizeCareerSessionRow(row: unknown): CareerSession {
  const value = row as CareerSession
  return {
    ...value,
    buy_in_minor: exactMinorValue(value.buy_in_minor, 'Session buy-in'),
    fees_minor: exactMinorValue(value.fees_minor, 'Session fees'),
    payout_minor: exactMinorValue(value.payout_minor, 'Session payout'),
    profit_minor: exactMinorValue(value.profit_minor, 'Session profit'),
  }
}

function normalizeBankrollAccountRow(row: unknown): BankrollAccount {
  const value = row as BankrollAccount
  return {
    ...value,
    opening_balance_minor: exactMinorValue(value.opening_balance_minor, 'Opening balance'),
  }
}

function normalizeLedgerEntryRow(row: unknown): LedgerEntry {
  const value = row as LedgerEntry
  return {
    ...value,
    amount_minor: exactMinorValue(value.amount_minor, 'Ledger amount'),
  }
}

function normalizeSettlementRow(row: unknown): Settlement {
  const value = row as Settlement
  return {
    ...value,
    amount_minor: exactMinorValue(value.amount_minor, 'Settlement amount'),
  }
}

export function currencyMinorDigits(currency: string): number {
  return CURRENCY_MINOR_DIGITS[normalizeCurrency(currency)] ?? 2
}

export function normalizeMinor(value: string | number | bigint): string {
  const text = String(value).trim()
  if (!/^-?\d+$/.test(text)) {
    throw new Error('Minor-unit amount must be a whole number.')
  }
  return BigInt(text).toString()
}

export function decimalToMinor(value: string, currency: string): string {
  const digits = currencyMinorDigits(currency)
  const cleaned = value.trim().replaceAll(',', '')
  const match = /^(-)?(\d+)(?:\.(\d*))?$/.exec(cleaned)
  if (!match) throw new Error('Enter a valid monetary amount.')

  const sign = match[1] ? -1n : 1n
  const whole = BigInt(match[2])
  const suppliedFraction = match[3] ?? ''
  const padded = suppliedFraction.padEnd(digits + 1, '0')
  const fraction = digits > 0 ? BigInt(padded.slice(0, digits) || '0') : 0n
  const roundingDigit = Number(padded[digits] ?? '0')
  const scale = 10n ** BigInt(digits)
  let minor = whole * scale + fraction
  if (roundingDigit >= 5) minor += 1n
  return (minor * sign).toString()
}

export function decimalToMinorExact(value: string, currency: string): string {
  const digits = currencyMinorDigits(currency)
  const cleaned = value.trim().replaceAll(',', '')
  const match = /^(-)?(\d+)(?:\.(\d*))?$/.exec(cleaned)
  if (!match) throw new Error('Enter a valid monetary amount.')
  if ((match[3] ?? '').length > digits) {
    throw new Error(
      digits === 0
        ? `${normalizeCurrency(currency)} does not use decimal minor units.`
        : `Use no more than ${digits} decimal places for ${normalizeCurrency(currency)}.`,
    )
  }
  return decimalToMinor(cleaned, currency)
}

export function minorToDecimal(value: string | number | bigint, currency: string): string {
  const digits = currencyMinorDigits(currency)
  const minor = BigInt(normalizeMinor(value))
  const negative = minor < 0n
  const absolute = negative ? -minor : minor
  if (digits === 0) return `${negative ? '-' : ''}${absolute}`
  const scale = 10n ** BigInt(digits)
  const whole = absolute / scale
  const fraction = (absolute % scale).toString().padStart(digits, '0')
  return `${negative ? '-' : ''}${whole}.${fraction}`
}

export function formatMinor(
  value: string | number | bigint,
  currency = 'USD',
  locale = 'en-US',
): string {
  const normalizedCurrency = normalizeCurrency(currency)
  const decimal = minorToDecimal(value, normalizedCurrency)
  const numeric = Number(decimal)
  if (Number.isSafeInteger(Math.trunc(numeric))) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: currencyMinorDigits(normalizedCurrency),
      maximumFractionDigits: currencyMinorDigits(normalizedCurrency),
    }).format(numeric)
  }
  return `${normalizedCurrency} ${decimal}`
}

export function sumMinor(values: Array<string | number | bigint>): string {
  return values.reduce<bigint>((sum, value) => sum + BigInt(normalizeMinor(value)), 0n).toString()
}

export function subtractMinor(
  minuend: string | number | bigint,
  ...subtrahends: Array<string | number | bigint>
): string {
  return subtrahends
    .reduce<bigint>((result, value) => result - BigInt(normalizeMinor(value)), BigInt(normalizeMinor(minuend)))
    .toString()
}

export function safePercent(numerator: bigint, denominator: bigint): number | null {
  if (denominator === 0n) return null
  return Number((numerator * 10_000n) / denominator) / 100
}

export function parseStandardBigBlindMinor(stakes: string | null, currency: string): string | null {
  if (!stakes) return null
  const match =
    /^\s*(?:[$€£]\s*)?(\d+(?:\.\d+)?)\s*\/\s*(?:[$€£]\s*)?(\d+(?:\.\d+)?)\s*$/.exec(
      stakes,
    )
  if (!match) return null
  try {
    const bigBlind = decimalToMinor(match[2], currency)
    return BigInt(bigBlind) > 0n ? bigBlind : null
  } catch {
    return null
  }
}

export function getAccountBalance(account: BankrollAccount, entries: LedgerEntry[]): string {
  const accountEntries = entries.filter(
    (entry) => entry.account_id === account.id && entry.currency === account.currency,
  )
  return sumMinor([account.opening_balance_minor, ...accountEntries.map((entry) => entry.amount_minor)])
}

export function dashboardMetricCurrencies(
  data: Pick<DashboardData, 'sessions' | 'accounts'>,
): CurrencyCode[] {
  const codes = new Set<CurrencyCode>([
    ...data.sessions
      .filter((session) => session.data_quality !== 'legacy_incomplete')
      .map((session) => session.currency),
    ...data.accounts
      .filter((account) => !account.is_archived)
      .map((account) => account.currency),
  ])
  return codes.size ? Array.from(codes).sort() : ['USD']
}

export function calculateTripSpend(
  expenses: Array<Pick<CareerExpense, 'trip_id' | 'amount_minor' | 'currency'>>,
  tripId: string,
  currency: string,
): { amountMinor: string; excludedCurrencyCount: number } {
  const tripCurrency = normalizeCurrency(currency)
  const linkedExpenses = expenses.filter((expense) => expense.trip_id === tripId)
  const matchingExpenses = linkedExpenses.filter((expense) => expense.currency === tripCurrency)
  return {
    amountMinor: sumMinor(matchingExpenses.map((expense) => expense.amount_minor)),
    excludedCurrencyCount: linkedExpenses.length - matchingExpenses.length,
  }
}

export function calculateCareerMetrics(data: DashboardData, currency = 'USD'): CareerMetrics {
  const trusted = data.sessions.filter(
    (session) => session.currency === currency && session.data_quality !== 'legacy_incomplete',
  )
  const profit = trusted.map((session) => session.profit_minor)
  const invested = trusted.map((session) =>
    sumMinor([session.buy_in_minor, session.fees_minor]),
  )
  const totalProfit = BigInt(sumMinor(profit))
  const totalInvested = BigInt(sumMinor(invested))
  const cashProfit = BigInt(sumMinor(trusted.filter((session) => session.session_kind === 'cash').map((session) => session.profit_minor)))
  const tournamentProfit = BigInt(sumMinor(trusted.filter((session) => session.session_kind === 'tournament').map((session) => session.profit_minor)))
  const totalMinutes = trusted.reduce((sum, session) => sum + (session.duration_minutes ?? 0), 0)
  const totalHands = trusted.reduce((sum, session) => sum + (session.hands_played ?? 0), 0)
  const cashSessionsWithHands = trusted.filter(
    (session) => session.session_kind === 'cash' && session.hands_played && session.stakes,
  )

  let peak = 0n
  let running = 0n
  let maximumDrawdown = 0n
  for (const session of [...trusted].sort((a, b) => a.played_at.localeCompare(b.played_at))) {
    running += BigInt(session.profit_minor)
    if (running > peak) peak = running
    const drawdown = peak - running
    if (drawdown > maximumDrawdown) maximumDrawdown = drawdown
  }

  const bankroll = sumMinor(
    data.accounts
      .filter((account) => account.currency === currency && !account.is_archived)
      .map((account) => getAccountBalance(account, data.ledger)),
  )
  const tournaments = trusted.filter((session) => session.session_kind === 'tournament')
  const tournamentCashes = tournaments.filter((session) => BigInt(session.payout_minor) > 0n).length
  const tournamentEntries = tournaments.reduce((sum, session) => sum + session.entries, 0)
  const abiMinor =
    tournamentEntries > 0
      ? (
          BigInt(sumMinor(tournaments.map((session) => session.buy_in_minor))) /
          BigInt(tournamentEntries)
        ).toString()
      : null
  const hourlyMinor =
    totalMinutes > 0
      ? ((totalProfit * 60n) / BigInt(totalMinutes)).toString()
      : null

  let trackedBigBlindsTimesMillion = 0n
  let trackedHands = 0
  let trackedMinutes = 0
  for (const session of cashSessionsWithHands) {
    const bigBlindMinor = parseStandardBigBlindMinor(session.stakes, session.currency)
    if (!bigBlindMinor || !session.hands_played) continue
    trackedBigBlindsTimesMillion +=
      (BigInt(session.profit_minor) * 1_000_000n) / BigInt(bigBlindMinor)
    trackedHands += session.hands_played
    trackedMinutes += session.duration_minutes ?? 0
  }
  const bbPer100 =
    trackedHands > 0
      ? Number((trackedBigBlindsTimesMillion * 100n) / BigInt(trackedHands)) / 1_000_000
      : null
  const bbPerHour =
    trackedMinutes > 0
      ? Number((trackedBigBlindsTimesMillion * 60n) / BigInt(trackedMinutes)) / 1_000_000
      : null

  return {
    totalProfitMinor: totalProfit.toString(),
    totalInvestedMinor: totalInvested.toString(),
    totalPayoutMinor: sumMinor(trusted.map((session) => session.payout_minor)),
    cashProfitMinor: cashProfit.toString(),
    tournamentProfitMinor: tournamentProfit.toString(),
    bankrollMinor: bankroll,
    totalMinutes,
    totalHands,
    sessionCount: trusted.length,
    tournamentCount: tournaments.length,
    tournamentCashes,
    tournamentEntries,
    roiPercent: safePercent(totalProfit, totalInvested),
    hourlyMinor,
    bbPer100,
    bbPerHour,
    abiMinor,
    drawdownMinor: maximumDrawdown.toString(),
    currency,
  }
}

export async function listCareerSessions(
  ownerId: string,
  limit = 250,
): Promise<CareerSession[]> {
  assertOwnerId(ownerId)
  const rows = await collectQueryPages(
    (from, to) =>
      supabase
        .from('career_sessions')
        .select('*')
        .eq('owner_id', ownerId)
        .order('played_at', { ascending: false })
        .range(from, to),
    limit,
  )
  return rows.map(normalizeCareerSessionRow)
}

export async function createCareerSession(
  ownerId: string,
  input: CareerSessionInput,
): Promise<CareerSession> {
  assertOwnerId(ownerId)
  const currency = normalizeCurrency(input.currency)
  const { data, error } = await supabase
    .from('career_sessions')
    .insert({
      ...input,
      owner_id: ownerId,
      currency,
      buy_in_minor: normalizeMinor(input.buy_in_minor),
      fees_minor: normalizeMinor(input.fees_minor),
      payout_minor: normalizeMinor(input.payout_minor),
      tags: input.tags ?? [],
      data_quality: input.data_quality ?? 'trusted',
    })
    .select()
    .single()
  throwIfError(error)
  return normalizeCareerSessionRow(data)
}

export async function listBankrollAccounts(ownerId: string): Promise<BankrollAccount[]> {
  assertOwnerId(ownerId)
  const rows = await collectQueryPages((from, to) =>
    supabase
      .from('bankroll_accounts')
      .select('*')
      .eq('owner_id', ownerId)
      .order('is_archived')
      .order('name')
      .range(from, to),
  )
  return rows.map(normalizeBankrollAccountRow)
}

export async function createBankrollAccount(
  ownerId: string,
  input: Pick<BankrollAccount, 'name' | 'account_type' | 'currency' | 'opening_balance_minor'>,
): Promise<BankrollAccount> {
  assertOwnerId(ownerId)
  const { data, error } = await supabase
    .from('bankroll_accounts')
    .insert({
      ...input,
      owner_id: ownerId,
      currency: normalizeCurrency(input.currency),
      opening_balance_minor: normalizeMinor(input.opening_balance_minor),
    })
    .select()
    .single()
  throwIfError(error)
  return normalizeBankrollAccountRow(data)
}

export async function listLedgerEntries(ownerId: string, limit = 500): Promise<LedgerEntry[]> {
  assertOwnerId(ownerId)
  const rows = await collectQueryPages(
    (from, to) =>
      supabase
        .from('bankroll_ledger_entries')
        .select('*')
        .eq('owner_id', ownerId)
        .order('occurred_at', { ascending: false })
        .range(from, to),
    limit,
  )
  return rows.map(normalizeLedgerEntryRow)
}

export async function postLedgerEntry(
  ownerId: string,
  input: {
    account_id: string
    session_id?: string | null
    entry_type: LedgerEntry['entry_type']
    amount_minor: string
    currency: CurrencyCode
    occurred_at: string
    description: string
    external_reference?: string | null
    idempotency_key: string
  },
): Promise<LedgerEntry> {
  assertOwnerId(ownerId)
  const { data, error } = await supabase.rpc('post_ledger_entry', {
    p_owner_id: ownerId,
    p_account_id: input.account_id,
    p_session_id: input.session_id ?? null,
    p_entry_type: input.entry_type,
    p_amount_minor: normalizeMinor(input.amount_minor),
    p_currency: normalizeCurrency(input.currency),
    p_occurred_at: input.occurred_at,
    p_description: input.description,
    p_external_reference: input.external_reference ?? null,
    p_idempotency_key: input.idempotency_key,
  })
  throwIfError(error)
  return normalizeLedgerEntryRow(data)
}

export async function reverseLedgerEntry(
  ownerId: string,
  entryId: string,
  reason: string,
  idempotencyKey: string = crypto.randomUUID(),
): Promise<LedgerEntry> {
  assertOwnerId(ownerId)
  const { data, error } = await supabase.rpc('reverse_ledger_entry', {
    p_owner_id: ownerId,
    p_entry_id: entryId,
    p_reason: reason,
    p_idempotency_key: idempotencyKey,
  })
  throwIfError(error)
  return normalizeLedgerEntryRow(data)
}

export async function listSettlements(ownerId: string): Promise<Settlement[]> {
  assertOwnerId(ownerId)
  const rows = await collectQueryPages((from, to) =>
    supabase
      .from('settlements')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .range(from, to),
  )
  return rows.map(normalizeSettlementRow)
}

export async function createSettlement(
  ownerId: string,
  input: SettlementInput,
): Promise<Settlement> {
  assertOwnerId(ownerId)
  const { data, error } = await supabase.rpc('create_settlement', {
    p_owner_id: ownerId,
    p_session_id: input.session_id ?? null,
    p_direction: input.direction,
    p_counterparty: input.counterparty,
    p_amount_minor: normalizeMinor(input.amount_minor),
    p_currency: normalizeCurrency(input.currency),
    p_reason: input.reason,
    p_external_method: input.external_method ?? null,
    p_external_handle: input.external_handle ?? null,
    p_memo: input.memo ?? null,
    p_due_date: input.due_date ?? null,
    p_idempotency_key: input.idempotency_key,
  })
  throwIfError(error)
  return normalizeSettlementRow(data)
}

export async function updateSettlementStatus(
  ownerId: string,
  settlementId: string,
  status: SettlementStatus,
  expectedRevision: number,
  idempotencyKey: string,
): Promise<Settlement> {
  assertOwnerId(ownerId)
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
    throw new Error('Settlement revision is invalid. Refresh and try again.')
  }
  if (!idempotencyKey.trim()) {
    throw new Error('A settlement operation key is required.')
  }
  const { data, error } = await supabase.rpc('transition_settlement', {
    p_settlement_id: settlementId,
    p_new_status: status,
    p_expected_revision: expectedRevision,
    p_idempotency_key: idempotencyKey,
  })
  throwIfError(error)
  return normalizeSettlementRow(data)
}

export async function listTrips(ownerId: string): Promise<PokerTrip[]> {
  assertOwnerId(ownerId)
  const rows = await collectQueryPages((from, to) =>
    supabase
      .from('poker_trips')
      .select('*')
      .eq('owner_id', ownerId)
      .order('starts_on', { ascending: false })
      .range(from, to),
  )
  return rows.map((row) => {
    const value = row as PokerTrip
    return {
      ...value,
      budget_minor: optionalExactMinorValue(value.budget_minor, 'Trip budget'),
    }
  })
}

export async function createTrip(
  ownerId: string,
  input: Omit<PokerTrip, 'id' | 'owner_id' | 'created_at'>,
): Promise<PokerTrip> {
  assertOwnerId(ownerId)
  const { data, error } = await supabase
    .from('poker_trips')
    .insert({
      ...input,
      owner_id: ownerId,
      currency: normalizeCurrency(input.currency),
      budget_minor: input.budget_minor ? normalizeMinor(input.budget_minor) : null,
    })
    .select()
    .single()
  throwIfError(error)
  const value = data as PokerTrip
  return {
    ...value,
    budget_minor: optionalExactMinorValue(value.budget_minor, 'Trip budget'),
  }
}

export async function listCareerExpenses(ownerId: string): Promise<CareerExpense[]> {
  assertOwnerId(ownerId)
  const rows = await collectQueryPages((from, to) =>
    supabase
      .from('career_expenses')
      .select('*')
      .eq('owner_id', ownerId)
      .order('incurred_on', { ascending: false })
      .range(from, to),
  )
  return rows.map((row) => {
    const value = row as CareerExpense
    return {
      ...value,
      amount_minor: exactMinorValue(value.amount_minor, 'Expense amount'),
    }
  })
}

export async function createCareerExpense(
  ownerId: string,
  input: Omit<CareerExpense, 'id' | 'owner_id' | 'receipt_path' | 'created_at'>,
): Promise<CareerExpense> {
  assertOwnerId(ownerId)
  const { data, error } = await supabase
    .from('career_expenses')
    .insert({
      ...input,
      owner_id: ownerId,
      currency: normalizeCurrency(input.currency),
      amount_minor: normalizeMinor(input.amount_minor),
    })
    .select()
    .single()
  throwIfError(error)
  const value = data as CareerExpense
  return {
    ...value,
    amount_minor: exactMinorValue(value.amount_minor, 'Expense amount'),
  }
}

export async function uploadExpenseReceipt(
  ownerId: string,
  expenseId: string,
  file: File,
): Promise<string> {
  assertOwnerId(ownerId)
  if (file.size === 0) {
    throw new Error('Receipt files cannot be empty.')
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Receipt files must be 10 MB or smaller.')
  }
  const allowedReceiptTypes = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  } as const
  const extension = allowedReceiptTypes[file.type as keyof typeof allowedReceiptTypes]
  if (!extension) {
    throw new Error('Use a PDF, JPEG, PNG, or WebP receipt file.')
  }
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  const contentFingerprint = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  const path = `${ownerId}/expenses/${expenseId}/${contentFingerprint}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from('career-documents')
    .upload(path, file, { contentType: file.type, upsert: true })
  throwIfError(uploadError)

  const attachReceipt = () =>
    supabase
      .from('career_expenses')
      .update({ receipt_path: path })
      .eq('owner_id', ownerId)
      .eq('id', expenseId)
      .select('id')
      .single()
  let { error: updateError } = await attachReceipt()
  if (updateError) {
    const retry = await attachReceipt()
    updateError = retry.error
  }
  if (!updateError) return path

  const definitiveRejectionCodes = new Set(['22P02', '23503', '42501', 'PGRST116'])
  if (definitiveRejectionCodes.has(updateError.code ?? '')) {
    const { error: cleanupError } = await supabase.storage
      .from('career-documents')
      .remove([path])
    if (cleanupError) {
      throw new Error(
        'The receipt could not be attached, and its uploaded file could not be cleaned up automatically.',
      )
    }
    throwIfError(updateError)
  }

  throw new Error(
    'The receipt was uploaded, but its attachment could not be verified. Retry the same file to finish safely.',
  )
}

export async function uploadSettlementConfirmation(
  ownerId: string,
  settlementId: string,
  expectedRevision: number,
  file: File,
  idempotencyKey: string,
): Promise<string> {
  assertOwnerId(ownerId)
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
    throw new Error('Settlement revision is invalid. Refresh and try again.')
  }
  if (file.size === 0) {
    throw new Error('Confirmation files cannot be empty.')
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Confirmation files must be 10 MB or smaller.')
  }
  const allowedConfirmationTypes = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  } as const
  const extension =
    allowedConfirmationTypes[file.type as keyof typeof allowedConfirmationTypes]
  if (!extension) {
    throw new Error('Use a PDF, JPEG, PNG, or WebP confirmation file.')
  }
  if (!idempotencyKey.trim()) {
    throw new Error('A confirmation operation key is required.')
  }
  const path = `${ownerId}/settlements/${settlementId}/${idempotencyKey}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from('career-documents')
    .upload(path, file, { contentType: file.type, upsert: false })
  const attachParams = {
    p_settlement_id: settlementId,
    p_confirmation_path: path,
    p_expected_revision: expectedRevision,
    p_idempotency_key: idempotencyKey,
  }
  let { error: attachError } = await supabase.rpc(
    'attach_settlement_confirmation',
    attachParams,
  )
  if (attachError) {
    const replay = await supabase.rpc('attach_settlement_confirmation', attachParams)
    attachError = replay.error
  }
  if (!attachError) return path

  if (uploadError) {
    throwIfError(uploadError)
  }

  const definitiveRejectionCodes = new Set(['22023', '42501', 'P0002'])
  if (definitiveRejectionCodes.has(attachError.code ?? '')) {
    const { error: cleanupError } = await supabase.storage.from('career-documents').remove([path])
    if (!cleanupError) {
      throwIfError(attachError)
    }
  }

  throw new Error(
    'The confirmation was uploaded, but its attachment could not be verified. Retry the same file; it will reuse the original operation safely.',
  )
}

export async function getPrivateDocumentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('career-documents')
    .createSignedUrl(path, 60)
  throwIfError(error)
  if (!data?.signedUrl) throw new Error('Could not create a private document link.')
  return data.signedUrl
}

export async function listStakingDeals(ownerId: string): Promise<StakingDeal[]> {
  assertOwnerId(ownerId)
  const rows = await collectQueryPages((from, to) =>
    supabase
      .from('staking_deals')
      .select('*')
      .eq('owner_id', ownerId)
      .order('starts_on', { ascending: false })
      .range(from, to),
  )
  return rows.map((row) => {
    const value = row as StakingDeal
    return {
      ...value,
      makeup_minor: exactMinorValue(value.makeup_minor, 'Staking makeup'),
    }
  })
}

export async function createStakingDeal(
  ownerId: string,
  input: Omit<StakingDeal, 'id' | 'owner_id' | 'created_at'>,
): Promise<StakingDeal> {
  assertOwnerId(ownerId)
  if (input.player_share_bps + input.backer_share_bps !== 10_000) {
    throw new Error('Player and backer shares must total 100%.')
  }
  const { data, error } = await supabase
    .from('staking_deals')
    .insert({
      ...input,
      owner_id: ownerId,
      currency: normalizeCurrency(input.currency),
      makeup_minor: normalizeMinor(input.makeup_minor),
    })
    .select()
    .single()
  throwIfError(error)
  const value = data as StakingDeal
  return {
    ...value,
    makeup_minor: exactMinorValue(value.makeup_minor, 'Staking makeup'),
  }
}

export async function listStakingAllocations(ownerId: string): Promise<StakingAllocation[]> {
  assertOwnerId(ownerId)
  const rows = await collectQueryPages((from, to) =>
    supabase
      .from('staking_allocations')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .range(from, to),
  )
  return rows.map((row) => {
    const value = row as StakingAllocation
    return {
      ...value,
      allocated_buy_in_minor: exactMinorValue(
        value.allocated_buy_in_minor,
        'Staking allocation',
      ),
      backer_result_minor: exactMinorValue(value.backer_result_minor, 'Backer result'),
      player_result_minor: exactMinorValue(value.player_result_minor, 'Player result'),
    }
  })
}

export async function createStakingAllocation(
  ownerId: string,
  input: {
    deal_id: string
    session_id: string
    allocated_buy_in_minor: string
    total_result_minor: string
    expected_makeup_minor: string
    notes?: string | null
    idempotency_key: string
  },
): Promise<StakingAllocationResult> {
  assertOwnerId(ownerId)
  if (!input.idempotency_key.trim()) {
    throw new Error('A staking allocation operation key is required.')
  }
  const { data, error } = await supabase.rpc('record_staking_allocation', {
    p_owner_id: ownerId,
    p_deal_id: input.deal_id,
    p_session_id: input.session_id,
    p_allocated_buy_in_minor: normalizeMinor(input.allocated_buy_in_minor),
    p_total_result_minor: normalizeMinor(input.total_result_minor),
    p_expected_makeup_minor: normalizeMinor(input.expected_makeup_minor),
    p_notes: input.notes ?? null,
    p_idempotency_key: input.idempotency_key,
  })
  throwIfError(error)
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('The staking allocation response was invalid.')
  }
  const result = data as unknown as StakingAllocationResult
  const allocation = result.allocation
  const deal = result.deal
  if (!allocation?.id || !deal?.id) {
    throw new Error('The staking allocation response was incomplete.')
  }
  return {
    allocation: {
      ...allocation,
      allocated_buy_in_minor: exactMinorValue(
        allocation.allocated_buy_in_minor,
        'Staking allocation',
      ),
      backer_result_minor: exactMinorValue(allocation.backer_result_minor, 'Backer result'),
      player_result_minor: exactMinorValue(allocation.player_result_minor, 'Player result'),
    },
    deal: {
      ...deal,
      makeup_minor: exactMinorValue(deal.makeup_minor, 'Staking makeup'),
    },
    makeup_before_minor: exactMinorValue(result.makeup_before_minor, 'Prior staking makeup'),
    makeup_after_minor: exactMinorValue(result.makeup_after_minor, 'Updated staking makeup'),
  }
}

export async function listProfessionalEvents(
  ownerId: string,
  from?: string,
  to?: string,
): Promise<ProfessionalCalendarEvent[]> {
  assertOwnerId(ownerId)
  const rows = await collectQueryPages((pageFrom, pageTo) => {
    let query = supabase
      .from('professional_calendar_events')
      .select('*')
      .eq('owner_id', ownerId)
      .order('starts_at')
    if (from) query = query.gte('starts_at', from)
    if (to) query = query.lte('starts_at', to)
    return query.range(pageFrom, pageTo)
  })
  return rows.map((row) => {
    const value = row as ProfessionalCalendarEvent
    return {
      ...value,
      exposure_minor: optionalExactMinorValue(value.exposure_minor, 'Calendar exposure'),
    }
  })
}

export async function createProfessionalEvent(
  ownerId: string,
  input: Omit<ProfessionalCalendarEvent, 'id' | 'owner_id' | 'created_at'>,
): Promise<ProfessionalCalendarEvent> {
  assertOwnerId(ownerId)
  const { data, error } = await supabase
    .from('professional_calendar_events')
    .insert({
      ...input,
      owner_id: ownerId,
      currency: normalizeCurrency(input.currency),
      exposure_minor: input.exposure_minor ? normalizeMinor(input.exposure_minor) : null,
    })
    .select()
    .single()
  throwIfError(error)
  const value = data as ProfessionalCalendarEvent
  return {
    ...value,
    exposure_minor: optionalExactMinorValue(value.exposure_minor, 'Calendar exposure'),
  }
}

export async function listPokerHands(ownerId: string): Promise<PokerHand[]> {
  assertOwnerId(ownerId)
  const rows = await collectQueryPages((from, to) =>
    supabase
      .from('poker_hands')
      .select('*')
      .eq('owner_id', ownerId)
      .order('played_at', { ascending: false })
      .range(from, to),
  )
  return rows.map((row) => {
    const value = row as PokerHand
    return {
      ...value,
      pot_minor: optionalExactMinorValue(value.pot_minor, 'Hand pot'),
      result_minor: optionalExactMinorValue(value.result_minor, 'Hand result'),
    }
  })
}

export async function createPokerHand(
  ownerId: string,
  input: Omit<PokerHand, 'id' | 'owner_id' | 'created_at'>,
): Promise<PokerHand> {
  assertOwnerId(ownerId)
  const { data, error } = await supabase
    .from('poker_hands')
    .insert({
      ...input,
      owner_id: ownerId,
      currency: normalizeCurrency(input.currency),
      pot_minor: input.pot_minor ? normalizeMinor(input.pot_minor) : null,
      result_minor: input.result_minor ? normalizeMinor(input.result_minor) : null,
    })
    .select()
    .single()
  throwIfError(error)
  const value = data as PokerHand
  return {
    ...value,
    pot_minor: optionalExactMinorValue(value.pot_minor, 'Hand pot'),
    result_minor: optionalExactMinorValue(value.result_minor, 'Hand result'),
  }
}

export async function updateHandReviewStatus(
  ownerId: string,
  handId: string,
  reviewStatus: PokerHand['review_status'],
): Promise<void> {
  assertOwnerId(ownerId)
  const { error } = await supabase
    .from('poker_hands')
    .update({ review_status: reviewStatus })
    .eq('owner_id', ownerId)
    .eq('id', handId)
  throwIfError(error)
}

export async function listStudySessions(ownerId: string): Promise<StudySession[]> {
  assertOwnerId(ownerId)
  return collectQueryPages((from, to) =>
    supabase
      .from('study_sessions')
      .select('*')
      .eq('owner_id', ownerId)
      .order('studied_at', { ascending: false })
      .range(from, to),
  )
}

export async function createStudySession(
  ownerId: string,
  input: Omit<StudySession, 'id' | 'owner_id' | 'created_at'>,
): Promise<StudySession> {
  assertOwnerId(ownerId)
  const { data, error } = await supabase
    .from('study_sessions')
    .insert({ ...input, owner_id: ownerId })
    .select()
    .single()
  throwIfError(error)
  return data as StudySession
}

export async function listCareerGoals(ownerId: string): Promise<CareerGoal[]> {
  assertOwnerId(ownerId)
  const rows = await collectQueryPages((from, to) =>
    supabase
      .from('career_goals')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .range(from, to),
  )
  return rows.map((row) => {
    const value = row as CareerGoal
    return {
      ...value,
      target_value:
        value.target_value === null || value.target_value === undefined
          ? null
          : String(value.target_value),
      current_value:
        value.current_value === null || value.current_value === undefined
          ? null
          : String(value.current_value),
    }
  })
}

export async function createCareerGoal(
  ownerId: string,
  input: Omit<CareerGoal, 'id' | 'owner_id' | 'created_at'>,
): Promise<CareerGoal> {
  assertOwnerId(ownerId)
  const { data, error } = await supabase
    .from('career_goals')
    .insert({ ...input, owner_id: ownerId })
    .select()
    .single()
  throwIfError(error)
  const value = data as CareerGoal
  return {
    ...value,
    target_value:
      value.target_value === null || value.target_value === undefined
        ? null
        : String(value.target_value),
    current_value:
      value.current_value === null || value.current_value === undefined
        ? null
        : String(value.current_value),
  }
}

export async function updateCareerGoal(
  ownerId: string,
  goalId: string,
  changes: Pick<CareerGoal, 'current_value' | 'status'>,
): Promise<void> {
  assertOwnerId(ownerId)
  const { error } = await supabase
    .from('career_goals')
    .update(changes)
    .eq('owner_id', ownerId)
    .eq('id', goalId)
  throwIfError(error)
}

export async function loadDashboardData(ownerId: string): Promise<DashboardData> {
  const now = new Date().toISOString()
  const [sessions, accounts, ledger, goals, upcomingEvents] = await Promise.all([
    listCareerSessions(ownerId, 500),
    listBankrollAccounts(ownerId),
    listLedgerEntries(ownerId, 1000),
    listCareerGoals(ownerId),
    listProfessionalEvents(ownerId, now),
  ])
  return { sessions, accounts, ledger, goals, upcomingEvents: upcomingEvents.slice(0, 8) }
}

export async function listPlaidCandidates(ownerId: string): Promise<PlaidCandidate[]> {
  assertOwnerId(ownerId)
  if (!PLAID_ENABLED) return []
  const rows = await collectQueryPages((from, to) =>
    supabase
      .from('plaid_reconciliation_candidates')
      .select('*')
      .eq('owner_id', ownerId)
      .order('date', { ascending: false })
      .range(from, to),
  )
  return rows.map((row) => {
    const value = row as PlaidCandidate
    return {
      ...value,
      amount_minor: exactMinorValue(value.amount_minor, 'Plaid candidate amount'),
    }
  })
}

export async function updatePlaidCandidate(
  ownerId: string,
  candidateId: string,
  status: PlaidCandidate['match_status'],
  ledgerEntryId?: string | null,
): Promise<void> {
  assertOwnerId(ownerId)
  if (!PLAID_ENABLED) throw new Error('Plaid reconciliation is disabled.')
  const { error } = await supabase
    .from('plaid_reconciliation_candidates')
    .update({
      match_status: status,
      matched_ledger_entry_id: status === 'matched' ? (ledgerEntryId ?? null) : null,
    })
    .eq('owner_id', ownerId)
    .eq('id', candidateId)
  throwIfError(error)
}

export async function invokePlaidFunction<T>(
  action: 'status' | 'create_link_token' | 'exchange_public_token' | 'sync' | 'disconnect',
  body: Record<string, unknown> = {},
): Promise<T> {
  if (!PLAID_ENABLED) throw new Error('Plaid reconciliation is disabled.')
  const { data, error } = await supabase.functions.invoke('plaid', {
    body: { ...body, action },
  })
  throwIfError(error)
  return data as T
}

const PLAID_CONNECTION_STORAGE_KEY = 'poker-manager:plaid-connection-id'

export function rememberPlaidConnection(ownerId: string, connectionId: string): void {
  if (!PLAID_ENABLED || typeof window === 'undefined') return
  assertOwnerId(ownerId)
  window.localStorage.setItem(
    PLAID_CONNECTION_STORAGE_KEY,
    JSON.stringify({ ownerId, connectionId }),
  )
}

export function rememberedPlaidConnection(ownerId: string): string | null {
  if (!PLAID_ENABLED || typeof window === 'undefined') return null
  assertOwnerId(ownerId)
  try {
    const value = JSON.parse(window.localStorage.getItem(PLAID_CONNECTION_STORAGE_KEY) ?? '')
    return value?.ownerId === ownerId && typeof value.connectionId === 'string'
      ? value.connectionId
      : null
  } catch {
    return null
  }
}

export function selectActivePlaidConnection(
  connections: PlaidConnection[],
  rememberedConnectionId: string | null,
): string | null {
  const activeConnections = connections.filter(
    (connection) => connection.status === 'active',
  )
  return (
    activeConnections.find((connection) => connection.id === rememberedConnectionId)?.id ??
    activeConnections[0]?.id ??
    null
  )
}

export function forgetPlaidConnection(ownerId: string): void {
  if (typeof window === 'undefined') return
  if (rememberedPlaidConnection(ownerId) === null) return
  window.localStorage.removeItem(PLAID_CONNECTION_STORAGE_KEY)
}

export function providerUrlForSettlement(settlement: Settlement): string | null {
  if (settlement.provider_url) {
    try {
      const url = new URL(settlement.provider_url)
      const allowedHosts = new Set([
        'venmo.com',
        'www.venmo.com',
        'paypal.com',
        'www.paypal.com',
        'paypal.me',
        'www.paypal.me',
        'cash.app',
      ])
      if (url.protocol === 'https:' && allowedHosts.has(url.hostname.toLowerCase())) {
        return url.toString()
      }
    } catch {
      return null
    }
    return null
  }
  const handle = settlement.external_handle?.trim()
  if (!handle) return null
  switch (settlement.external_method?.trim().toLowerCase()) {
    case 'venmo':
      return `https://venmo.com/u/${encodeURIComponent(handle.replace(/^@/, ''))}`
    case 'paypal':
      return `https://www.paypal.com/paypalme/${encodeURIComponent(handle.replace(/^@/, ''))}`
    case 'cash app':
    case 'cashapp':
      return `https://cash.app/$${encodeURIComponent(handle.replace(/^\$/, ''))}`
    default:
      return null
  }
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const normalized = Array.isArray(value) ? value.join('|') : String(value)
  return `"${normalized.replaceAll('"', '""')}"`
}

export function toCsv<T extends object>(rows: T[]): string {
  if (rows.length === 0) return ''
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  return [
    columns.map(csvCell).join(','),
    ...rows.map((row) =>
      columns.map((column) => csvCell((row as Record<string, unknown>)[column])).join(','),
    ),
  ].join('\r\n')
}

export function downloadTextFile(filename: string, contents: string, type = 'text/csv'): void {
  const blob = new Blob([contents], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function openPrintableReport(title: string, sections: Array<{ title: string; html: string }>): void {
  const reportWindow = window.open('', '_blank')
  if (!reportWindow) throw new Error('Allow pop-ups to open the printable report.')
  reportWindow.opener = null
  const safeTitle = escapeHtml(title)
  reportWindow.document.write(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${safeTitle}</title>
<style>
body{font:14px/1.45 system-ui,sans-serif;color:#17211b;margin:32px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:17px;margin:24px 0 8px}
p{margin:4px 0}.meta{color:#607066;margin-bottom:20px}
table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #d8ded9;padding:7px 6px;text-align:left}
th{font-size:11px;text-transform:uppercase;color:#607066}.num{text-align:right;font-variant-numeric:tabular-nums}
@page{margin:16mm}@media print{body{margin:0}.no-print{display:none}}
</style></head><body><button class="no-print" onclick="window.print()">Print / save PDF</button>
<h1>${safeTitle}</h1><p class="meta">Generated ${escapeHtml(new Date().toLocaleString())}</p>
${sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2>${section.html}</section>`).join('')}
<script>setTimeout(()=>window.print(),250)</script></body></html>`)
  reportWindow.document.close()
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function exportFilename(subject: string, extension = 'csv'): string {
  const date = new Date().toISOString().slice(0, 10)
  const safeSubject = subject.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/(^-|-$)/g, '')
  return `poker-manager-${safeSubject}-${date}.${extension}`
}

export function formatDate(value: string | null): string {
  if (!value) return '—'
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])))
    : new Date(value)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(dateOnly ? { timeZone: 'UTC' } : {}),
  }).format(date)
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function todayInputValue(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

export function localDateTimeInputValue(date = new Date()): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function detectTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}
