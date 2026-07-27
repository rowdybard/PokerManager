import type { PostgrestError } from '@supabase/supabase-js'
import { formatMoney, money } from './money'
import { supabase } from './supabase'
import type { GameResultVersion } from './transactionalSafety'
import type {
  Game,
  GameInvite,
  GameResult,
  League,
  LeagueRole,
  Player,
  PointsSystem,
  RsvpStatus,
  Season,
  StandingEntry,
} from '../types'
import type { Json } from '../types/database'

// Keep this module tolerant of a generated Database type being introduced. The
// home-game expansion lands through migrations, so optional tables may not be
// present in every preview environment while the legacy tables remain usable.
// RLS is still enforced by Supabase for every request.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export type GameKind = 'cash' | 'tournament'
export type GamePhase =
  | 'draft'
  | 'inviting'
  | 'registration'
  | 'in_progress'
  | 'closing'
  | 'finalized'
  | 'cancelled'
export type HomeRsvpStatus = RsvpStatus
export type GameTransactionKind =
  | 'buy_in'
  | 'reload'
  | 'cash_out'
  | 'entry'
  | 're_entry'
  | 'add_on'
  | 'bounty'
  | 'payout'
  | 'fee'
  | 'tip'
  | 'adjustment'

export interface HomeGame extends Game {
  title: string | null
  kind: GameKind
  phase: GamePhase
  currency: string
  capacity: number | null
  small_blind: number | null
  big_blind: number | null
  min_buy_in: number | null
  max_buy_in: number | null
  entry_fee: number | null
  rake: number | null
  invite_token_expires_at: string | null
}

export interface LeagueAccess {
  role: LeagueRole | null
  canManage: boolean
  isOwner: boolean
}

export interface LeagueSummary extends League {
  role: LeagueRole
}

export interface HomeGameListItem extends HomeGame {
  league_name: string
  role: LeagueRole
}

export interface HomeParticipant {
  id: string
  game_id: string
  player_id: string
  display_name: string
  rsvp_status: HomeRsvpStatus
  checked_in_at: string | null
  guest_count: number
  table_number: number | null
  seat_number: number | null
  finish_position?: number | null
  eliminated_at?: string | null
}

export interface GameTransaction {
  id: string
  game_id: string
  participant_id: string | null
  player_id: string | null
  kind: GameTransactionKind
  amount_minor: string
  currency: string
  note: string | null
  created_at: string
  reversed_at: string | null
  queued?: boolean
}

export interface GameSeat {
  id: string
  game_id: string
  participant_id: string
  table_number: number
  seat_number: number
  active: boolean
}

export interface BlindLevel {
  id: string
  game_id: string
  level_number: number
  small_blind: number
  big_blind: number
  ante: number
  duration_seconds: number
  is_break: boolean
  label: string | null
}

export interface TournamentClockState {
  game_id: string
  current_level: number
  remaining_seconds: number
  is_running: boolean
  started_at: string | null
  paused_at: string | null
  revision: string
  updated_at: string | null
}

export interface GameWorkspace {
  game: HomeGame
  league: League
  access: LeagueAccess
  players: Player[]
  results: GameResult[]
  resultVersions: GameResultVersion[]
  invites: GameInvite[]
  participants: HomeParticipant[]
  transactions: GameTransaction[]
  seats: GameSeat[]
  blindLevels: BlindLevel[]
  clock: TournamentClockState | null
}

export interface ScheduleGameInput {
  templateId: string
  scheduledDate: string
  title?: string
  idempotencyKey: string
}

export type CreateGameFromTemplateInput = ScheduleGameInput

export interface Contact {
  id: string
  owner_id: string
  user_id: string | null
  display_name: string
  email: string | null
  phone: string | null
  notes: string | null
  preferred_currency: string
  merged_into_id: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface LeagueContact extends Contact {
  league_id: string
  player_id: string | null
  added_at: string
}

export interface ContactGroup {
  id: string
  owner_id: string
  league_id: string | null
  name: string
  created_at: string
  updated_at: string
  memberContactIds: string[]
}

export interface CreateContactInput {
  ownerId: string
  displayName: string
  email?: string
  phone?: string
  notes?: string
  preferredCurrency?: string
  userId?: string | null
}

export interface UpdateContactInput {
  displayName?: string
  email?: string | null
  phone?: string | null
  notes?: string | null
  preferredCurrency?: string
  userId?: string | null
  mergedIntoId?: string | null
}

export interface GameTemplate {
  id: string
  owner_id: string
  league_id: string
  name: string
  kind: GameKind
  timezone: string
  recurrence_rule: string | null
  capacity: number | null
  location: string | null
  currency: string
  buy_in_minor: string
  small_blind_minor: string | null
  big_blind_minor: string | null
  min_buy_in_minor: string | null
  max_buy_in_minor: string | null
  entry_fee_minor: string
  rake_minor: string
  bounty_minor: string
  payout_rules: Json
  reminder_schedule: Json
  structure_id: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface GameTemplateDetail extends GameTemplate {
  inviteeContactIds: string[]
  inviteeGroupIds: string[]
}

export interface TournamentStructure {
  id: string
  owner_id: string
  league_id: string | null
  name: string
  starting_stack: string
  late_registration_level: number | null
  notes: string | null
  levels: BlindLevel[]
}

export interface CreateTournamentStructureInput {
  ownerId: string
  leagueId: string
  name: string
  startingStack: string
  lateRegistrationLevel?: number | null
  notes?: string
  levels: Array<{
    levelNumber: number
    smallBlind: string
    bigBlind: string
    ante?: string
    durationSeconds: number
    isBreak?: boolean
    label?: string
  }>
}

export interface CreateGameTemplateInput {
  ownerId: string
  leagueId: string
  name: string
  kind: GameKind
  timezone?: string
  recurrenceRule?: string
  capacity?: number | null
  location?: string
  currency?: string
  buyInMinor?: string
  smallBlindMinor?: string | null
  bigBlindMinor?: string | null
  minBuyInMinor?: string | null
  maxBuyInMinor?: string | null
  entryFeeMinor?: string
  rakeMinor?: string
  bountyMinor?: string
  payoutRules?: Json
  reminderSchedule?: Json
  structureId?: string | null
  contactIds?: string[]
  groupIds?: string[]
}

export interface UpdateGameTemplateInput {
  name?: string
  kind?: GameKind
  timezone?: string
  recurrenceRule?: string | null
  capacity?: number | null
  location?: string | null
  currency?: string
  buyInMinor?: string
  smallBlindMinor?: string | null
  bigBlindMinor?: string | null
  minBuyInMinor?: string | null
  maxBuyInMinor?: string | null
  entryFeeMinor?: string
  rakeMinor?: string
  bountyMinor?: string
  payoutRules?: Json
  reminderSchedule?: Json
  structureId?: string | null
}

export interface RecordTransactionInput {
  gameId: string
  participantId?: string | null
  playerId?: string | null
  kind: GameTransactionKind
  amountMinor: string
  currency: string
  note?: string
  idempotencyKey: string
}

export interface CloseoutSummary {
  inflowMinor: bigint
  outflowMinor: bigint
  varianceMinor: bigint
  activeEntries: number
}

interface DbErrorLike {
  message?: string
  details?: string
  hint?: string
  code?: string
}

const LEGACY_STATUS_TO_PHASE: Record<Game['status'], GamePhase> = {
  scheduled: 'registration',
  in_progress: 'in_progress',
  completed: 'finalized',
  cancelled: 'cancelled',
}

const PHASE_TO_LEGACY_STATUS: Record<GamePhase, Game['status']> = {
  draft: 'scheduled',
  inviting: 'scheduled',
  registration: 'scheduled',
  in_progress: 'in_progress',
  closing: 'in_progress',
  finalized: 'completed',
  cancelled: 'cancelled',
}

const RSVP_FROM_LEGACY: Record<string, HomeRsvpStatus> = {
  pending: 'pending',
  confirmed: 'yes',
  yes: 'yes',
  maybe: 'maybe',
  declined: 'no',
  no: 'no',
  waitlisted: 'waitlisted',
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function minorAmountAsMajor(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  try {
    return Number(BigInt(String(value))) / 100
  } catch {
    return null
  }
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function requiredText(value: string, label: string): string {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${label} is required.`)
  return normalized
}

function optionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const normalized = value.trim()
  return normalized || null
}

function currencyCode(value = 'USD'): string {
  const normalized = value.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error('Currency must be a three-letter ISO 4217 code.')
  }
  return normalized
}

function nonNegativeMinorAmount(value: string | null | undefined, label: string): string | null {
  if (value === null) return null
  const normalized = value === undefined ? '0' : value.trim()
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a non-negative integer in minor units.`)
  }
  return BigInt(normalized).toString()
}

function validateCapacity(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (!Number.isInteger(value) || value < 1) {
    throw new Error('Capacity must be a positive whole number.')
  }
  return value
}

function uniqueIds(ids: string[] | undefined): string[] {
  return [...new Set((ids ?? []).map((id) => id.trim()).filter(Boolean))]
}

export function asContact(value: unknown): Contact {
  const row = asRecord(value)
  return {
    id: String(row.id ?? ''),
    owner_id: String(row.owner_id ?? ''),
    user_id: stringOrNull(row.user_id),
    display_name: String(row.display_name ?? ''),
    email: stringOrNull(row.email),
    phone: stringOrNull(row.phone),
    notes: stringOrNull(row.notes),
    preferred_currency:
      typeof row.preferred_currency === 'string' ? row.preferred_currency : 'USD',
    merged_into_id: stringOrNull(row.merged_into_id),
    archived_at: stringOrNull(row.archived_at),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}

export function asGameTemplate(value: unknown): GameTemplate {
  const row = asRecord(value)
  const nullableMinor = (field: string): string | null => {
    const amount = row[field]
    return amount === null || amount === undefined ? null : String(amount)
  }
  return {
    id: String(row.id ?? ''),
    owner_id: String(row.owner_id ?? ''),
    league_id: String(row.league_id ?? ''),
    name: String(row.name ?? ''),
    kind: row.kind === 'cash' ? 'cash' : 'tournament',
    timezone: typeof row.timezone === 'string' ? row.timezone : 'America/New_York',
    recurrence_rule: stringOrNull(row.recurrence_rule),
    capacity: numberOrNull(row.capacity),
    location: stringOrNull(row.location),
    currency: typeof row.currency === 'string' ? row.currency : 'USD',
    buy_in_minor: String(row.buy_in_minor ?? '0'),
    small_blind_minor: nullableMinor('small_blind_minor'),
    big_blind_minor: nullableMinor('big_blind_minor'),
    min_buy_in_minor: nullableMinor('min_buy_in_minor'),
    max_buy_in_minor: nullableMinor('max_buy_in_minor'),
    entry_fee_minor: String(row.entry_fee_minor ?? '0'),
    rake_minor: String(row.rake_minor ?? '0'),
    bounty_minor: String(row.bounty_minor ?? '0'),
    payout_rules: (row.payout_rules ?? {}) as Json,
    reminder_schedule: (row.reminder_schedule ?? []) as Json,
    structure_id: stringOrNull(row.structure_id),
    is_archived: Boolean(row.is_archived),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}

function asGameTemplateDetail(value: unknown): GameTemplateDetail {
  const row = asRecord(value)
  const invitees = asArray(row.game_template_invitees).map(asRecord)
  return {
    ...asGameTemplate(row),
    inviteeContactIds: uniqueIds(
      invitees.map((invitee) => stringOrNull(invitee.contact_id) ?? '')
    ),
    inviteeGroupIds: uniqueIds(
      invitees.map((invitee) => stringOrNull(invitee.group_id) ?? '')
    ),
  }
}

export function asHomeGame(value: unknown): HomeGame {
  const row = asRecord(value)
  const status = (row.status as Game['status'] | undefined) ?? 'scheduled'
  const rawPhase = row.phase
  const phase =
    typeof rawPhase === 'string' &&
    ['draft', 'inviting', 'registration', 'in_progress', 'closing', 'finalized', 'cancelled'].includes(
      rawPhase
    )
      ? (rawPhase as GamePhase)
      : LEGACY_STATUS_TO_PHASE[status]

  return {
    ...(row as unknown as Game),
    status,
    title: stringOrNull(row.title),
    kind: row.kind === 'cash' ? 'cash' : 'tournament',
    phase,
    currency: typeof row.currency === 'string' ? row.currency : 'USD',
    capacity: numberOrNull(row.capacity),
    small_blind: numberOrNull(row.small_blind) ?? minorAmountAsMajor(row.small_blind_minor),
    big_blind: numberOrNull(row.big_blind) ?? minorAmountAsMajor(row.big_blind_minor),
    min_buy_in: numberOrNull(row.min_buy_in) ?? minorAmountAsMajor(row.min_buy_in_minor),
    max_buy_in: numberOrNull(row.max_buy_in) ?? minorAmountAsMajor(row.max_buy_in_minor),
    entry_fee: numberOrNull(row.entry_fee) ?? minorAmountAsMajor(row.entry_fee_minor),
    rake: numberOrNull(row.rake) ?? minorAmountAsMajor(row.rake_minor),
    invite_token_expires_at: stringOrNull(row.invite_token_expires_at),
  }
}

export function normalizeRsvp(value: unknown): HomeRsvpStatus {
  return RSVP_FROM_LEGACY[String(value)] ?? 'pending'
}

export function legacyStatusForPhase(phase: GamePhase): Game['status'] {
  return PHASE_TO_LEGACY_STATUS[phase]
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof Error && error.message) return error.message
  const candidate = error as DbErrorLike | null
  if (candidate?.message) {
    const details = candidate.details ? ` ${candidate.details}` : ''
    const hint = candidate.hint ? ` ${candidate.hint}` : ''
    return `${candidate.message}${details}${hint}`.trim()
  }
  return fallback
}

function throwIfError(error: PostgrestError | DbErrorLike | null, fallback?: string): void {
  if (error) throw new Error(errorMessage(error, fallback))
}

function isOptionalFeatureUnavailable(error: DbErrorLike | null): boolean {
  return Boolean(
    error &&
      ['PGRST204', 'PGRST205', '42P01', '42703'].includes(error.code ?? '')
  )
}

export function createIdempotencyKey(prefix: string): string {
  const id = crypto.randomUUID()
  return `${prefix}:${id}`
}

export function parseLocalDateTime(value: string): string {
  if (!value) throw new Error('Choose a date and time.')
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error('Enter a valid date and time.')
  return parsed.toISOString()
}

export function gameDisplayName(game: HomeGame, leagueName?: string): string {
  return game.title ?? leagueName ?? (game.kind === 'cash' ? 'Cash game' : 'Tournament')
}

export function gamePhaseLabel(phase: GamePhase): string {
  const labels: Record<GamePhase, string> = {
    draft: 'Draft',
    inviting: 'Inviting',
    registration: 'Registration',
    in_progress: 'In progress',
    closing: 'Closing',
    finalized: 'Finalized',
    cancelled: 'Cancelled',
  }
  return labels[phase]
}

export function getGameCategory(game: HomeGame, now = new Date()): 'live' | 'upcoming' | 'past' | 'cancelled' {
  if (game.phase === 'cancelled') return 'cancelled'
  if (['in_progress', 'closing'].includes(game.phase)) return 'live'
  if (game.phase === 'finalized') return 'past'
  const date = new Date(game.scheduled_date)
  return !Number.isNaN(date.getTime()) && date.getTime() < now.getTime() ? 'past' : 'upcoming'
}

export function summarizeCloseout(transactions: GameTransaction[]): CloseoutSummary {
  let inflowMinor = 0n
  let outflowMinor = 0n
  let activeEntries = 0

  for (const transaction of transactions) {
    if (transaction.reversed_at) continue
    const amount = BigInt(transaction.amount_minor || '0')
    if (['buy_in', 'reload', 'entry', 're_entry', 'add_on', 'fee', 'tip'].includes(transaction.kind)) {
      inflowMinor += amount
      if (['buy_in', 'entry'].includes(transaction.kind)) activeEntries += 1
    } else if (['cash_out', 'payout', 'bounty'].includes(transaction.kind)) {
      outflowMinor += amount
    } else {
      // An adjustment follows its sign.
      if (amount >= 0n) inflowMinor += amount
      else outflowMinor += -amount
    }
  }

  return {
    inflowMinor,
    outflowMinor,
    varianceMinor: inflowMinor - outflowMinor,
    activeEntries,
  }
}

export async function getLeagueAccess(userId: string, leagueId: string): Promise<LeagueAccess> {
  const { data, error } = await db
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .maybeSingle()
  throwIfError(error)
  const role = (data?.role as LeagueRole | undefined) ?? null
  return {
    role,
    canManage: role === 'owner' || role === 'admin',
    isOwner: role === 'owner',
  }
}

export async function loadLeaguesForUser(userId: string): Promise<LeagueSummary[]> {
  const { data: memberships, error: membershipError } = await db
    .from('league_members')
    .select('league_id, role')
    .eq('user_id', userId)
  throwIfError(membershipError)

  const roleByLeague = new Map<string, LeagueRole>(
    (memberships ?? []).map((membership: { league_id: string; role: LeagueRole }) => [
      membership.league_id,
      membership.role,
    ])
  )
  const leagueIds = [...roleByLeague.keys()]
  if (leagueIds.length === 0) return []

  const { data, error } = await db
    .from('leagues')
    .select('*')
    .in('id', leagueIds)
    .order('created_at', { ascending: false })
  throwIfError(error)
  return (data ?? []).map((league: League) => ({
    ...league,
    role: roleByLeague.get(league.id) ?? 'member',
  }))
}

export async function loadGamesForUser(userId: string): Promise<HomeGameListItem[]> {
  const leagues = await loadLeaguesForUser(userId)
  if (leagues.length === 0) return []
  const leagueById = new Map(leagues.map((league) => [league.id, league]))

  const { data, error } = await db
    .from('games')
    .select('*, leagues(name)')
    .in('league_id', leagues.map((league) => league.id))
    .order('scheduled_date', { ascending: false })
  throwIfError(error)

  return (data ?? []).map((row: unknown) => {
    const record = asRecord(row)
    const game = asHomeGame(record)
    const league = leagueById.get(game.league_id)
    const joinedLeague = asRecord(record.leagues)
    return {
      ...game,
      league_name:
        (typeof joinedLeague.name === 'string' ? joinedLeague.name : null) ??
        league?.name ??
        '',
      role: league?.role ?? 'member',
    }
  })
}

export async function loadLeagueWorkspace(userId: string, leagueId: string): Promise<{
  league: League
  seasons: Season[]
  players: Player[]
  access: LeagueAccess
}> {
  const [leagueResponse, seasonsResponse, playersResponse, access] = await Promise.all([
    db.from('leagues').select('*').eq('id', leagueId).single(),
    db
      .from('seasons')
      .select('*')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false }),
    db.from('players').select('*').eq('league_id', leagueId).order('display_name'),
    getLeagueAccess(userId, leagueId),
  ])
  throwIfError(leagueResponse.error)
  throwIfError(seasonsResponse.error)
  throwIfError(playersResponse.error)
  return {
    league: leagueResponse.data as League,
    seasons: (seasonsResponse.data ?? []) as Season[],
    players: (playersResponse.data ?? []) as Player[],
    access,
  }
}

export async function loadContacts(
  ownerId: string,
  includeArchived = false
): Promise<Contact[]> {
  let query = db
    .from('contacts')
    .select('*')
    .eq('owner_id', ownerId)
    .is('merged_into_id', null)
    .order('display_name')
  if (!includeArchived) query = query.is('archived_at', null)
  const { data, error } = await query
  throwIfError(error)
  return (data ?? []).map(asContact)
}

export async function loadLeagueContacts(leagueId: string): Promise<LeagueContact[]> {
  const { data, error } = await db
    .from('league_contacts')
    .select('league_id, player_id, added_at, contacts(*)')
    .eq('league_id', leagueId)
    .order('added_at')
  throwIfError(error)

  return (data ?? [])
    .map((value: unknown) => {
      const row = asRecord(value)
      const contact = asContact(row.contacts)
      if (!contact.id) return null
      return {
        ...contact,
        league_id: String(row.league_id ?? leagueId),
        player_id: stringOrNull(row.player_id),
        added_at: String(row.added_at ?? ''),
      }
    })
    .filter((contact: LeagueContact | null): contact is LeagueContact => contact !== null)
    .sort((left: LeagueContact, right: LeagueContact) =>
      left.display_name.localeCompare(right.display_name)
    )
}

export async function createContact(input: CreateContactInput): Promise<Contact> {
  const { data, error } = await db
    .from('contacts')
    .insert({
      owner_id: input.ownerId,
      user_id: input.userId ?? null,
      display_name: requiredText(input.displayName, 'Contact name'),
      email: optionalText(input.email),
      phone: optionalText(input.phone),
      notes: optionalText(input.notes),
      preferred_currency: currencyCode(input.preferredCurrency),
    })
    .select()
    .single()
  throwIfError(error)
  return asContact(data)
}

export async function updateContact(
  contactId: string,
  changes: UpdateContactInput
): Promise<Contact> {
  const payload: Record<string, unknown> = {}
  if (changes.displayName !== undefined) {
    payload.display_name = requiredText(changes.displayName, 'Contact name')
  }
  if (changes.email !== undefined) payload.email = optionalText(changes.email)
  if (changes.phone !== undefined) payload.phone = optionalText(changes.phone)
  if (changes.notes !== undefined) payload.notes = optionalText(changes.notes)
  if (changes.preferredCurrency !== undefined) {
    payload.preferred_currency = currencyCode(changes.preferredCurrency)
  }
  if (changes.userId !== undefined) payload.user_id = changes.userId
  if (changes.mergedIntoId !== undefined) payload.merged_into_id = changes.mergedIntoId

  const { data, error } =
    Object.keys(payload).length > 0
      ? await db
          .from('contacts')
          .update(payload)
          .eq('id', contactId)
          .select()
          .single()
      : await db.from('contacts').select('*').eq('id', contactId).single()
  throwIfError(error)
  return asContact(data)
}

export async function setContactArchived(
  contactId: string,
  archived: boolean
): Promise<Contact> {
  const { data, error } = await db
    .from('contacts')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', contactId)
    .select()
    .single()
  throwIfError(error)
  return asContact(data)
}

export async function deleteContact(contactId: string): Promise<void> {
  const { error } = await db.from('contacts').delete().eq('id', contactId)
  throwIfError(error)
}

export async function linkContactToLeague(
  leagueId: string,
  contactId: string,
  playerId?: string | null
): Promise<void> {
  const payload: Record<string, unknown> = {
    league_id: leagueId,
    contact_id: contactId,
  }
  if (playerId !== undefined) payload.player_id = playerId

  const { error } =
    playerId === undefined
      ? await db
          .from('league_contacts')
          .upsert(payload, {
            onConflict: 'league_id,contact_id',
            ignoreDuplicates: true,
          })
      : await db
          .from('league_contacts')
          .upsert(payload, { onConflict: 'league_id,contact_id' })
  throwIfError(error)
}

export async function unlinkContactFromLeague(
  leagueId: string,
  contactId: string
): Promise<void> {
  const { error } = await db
    .from('league_contacts')
    .delete()
    .eq('league_id', leagueId)
    .eq('contact_id', contactId)
  throwIfError(error)
}

export async function loadContactGroups(leagueId: string): Promise<ContactGroup[]> {
  const { data, error } = await db
    .from('contact_groups')
    .select('*, contact_group_members(contact_id)')
    .eq('league_id', leagueId)
    .order('name')
  throwIfError(error)
  return (data ?? []).map((value: unknown) => {
    const row = asRecord(value)
    const members = Array.isArray(row.contact_group_members)
      ? row.contact_group_members
      : []
    return {
      id: String(row.id),
      owner_id: String(row.owner_id),
      league_id: stringOrNull(row.league_id),
      name: String(row.name),
      created_at: String(row.created_at ?? ''),
      updated_at: String(row.updated_at ?? ''),
      memberContactIds: members
        .map((member) => String(asRecord(member).contact_id ?? ''))
        .filter(Boolean),
    }
  })
}

export async function replaceContactGroupMembers(
  groupId: string,
  contactIds: string[]
): Promise<void> {
  const { error: deleteError } = await db
    .from('contact_group_members')
    .delete()
    .eq('group_id', groupId)
  throwIfError(deleteError)
  const ids = uniqueIds(contactIds)
  if (ids.length === 0) return
  const { error } = await db.from('contact_group_members').insert(
    ids.map((contactId) => ({ group_id: groupId, contact_id: contactId }))
  )
  throwIfError(error)
}

export async function createContactGroup(input: {
  ownerId: string
  leagueId: string
  name: string
  contactIds: string[]
}): Promise<ContactGroup> {
  const { data, error } = await db
    .from('contact_groups')
    .insert({
      owner_id: input.ownerId,
      league_id: input.leagueId,
      name: requiredText(input.name, 'Group name'),
    })
    .select()
    .single()
  throwIfError(error)
  try {
    await replaceContactGroupMembers(data.id, input.contactIds)
  } catch (memberError) {
    await db.from('contact_groups').delete().eq('id', data.id)
    throw memberError
  }
  const groups = await loadContactGroups(input.leagueId)
  const group = groups.find((entry) => entry.id === data.id)
  if (!group) throw new Error('Invite group was created but could not be reloaded.')
  return group
}

export async function deleteContactGroup(groupId: string): Promise<void> {
  const { error } = await db.from('contact_groups').delete().eq('id', groupId)
  throwIfError(error)
}

const TEMPLATE_WITH_INVITEES =
  '*, game_template_invitees(contact_id, group_id)'

export async function loadGameTemplates(
  leagueId: string,
  includeArchived = false
): Promise<GameTemplateDetail[]> {
  let query = db
    .from('game_templates')
    .select(TEMPLATE_WITH_INVITEES)
    .eq('league_id', leagueId)
    .order('name')
  if (!includeArchived) query = query.eq('is_archived', false)
  const { data, error } = await query
  throwIfError(error)
  return (data ?? []).map(asGameTemplateDetail)
}

export async function loadGameTemplate(templateId: string): Promise<GameTemplateDetail> {
  const { data, error } = await db
    .from('game_templates')
    .select(TEMPLATE_WITH_INVITEES)
    .eq('id', templateId)
    .single()
  throwIfError(error)
  return asGameTemplateDetail(data)
}

export async function loadTournamentStructures(
  leagueId: string
): Promise<TournamentStructure[]> {
  const { data, error } = await db
    .from('tournament_structures')
    .select('*, tournament_structure_levels(*)')
    .eq('league_id', leagueId)
    .order('name')
  throwIfError(error)
  return (data ?? []).map((value: unknown) => {
    const row = asRecord(value)
    const levels = Array.isArray(row.tournament_structure_levels)
      ? row.tournament_structure_levels
      : []
    return {
      id: String(row.id),
      owner_id: String(row.owner_id),
      league_id: stringOrNull(row.league_id),
      name: String(row.name),
      starting_stack: String(row.starting_stack ?? '10000'),
      late_registration_level: numberOrNull(row.late_registration_level),
      notes: stringOrNull(row.notes),
      levels: levels
        .map((level) => {
          const levelRow = asRecord(level)
          return {
            id: String(levelRow.id),
            game_id: '',
            level_number: Number(levelRow.level_number),
            small_blind: Number(levelRow.small_blind ?? 0),
            big_blind: Number(levelRow.big_blind ?? 0),
            ante: Number(levelRow.ante ?? 0),
            duration_seconds: Number(levelRow.duration_seconds ?? 1200),
            is_break: Boolean(levelRow.is_break),
            label: stringOrNull(levelRow.label),
          }
        })
        .sort((left, right) => left.level_number - right.level_number),
    }
  })
}

export async function createTournamentStructure(
  input: CreateTournamentStructureInput
): Promise<TournamentStructure> {
  if (input.levels.length === 0) {
    throw new Error('Add at least one blind level.')
  }
  const { data: structure, error } = await db
    .from('tournament_structures')
    .insert({
      owner_id: input.ownerId,
      league_id: input.leagueId,
      name: requiredText(input.name, 'Structure name'),
      starting_stack: nonNegativeMinorAmount(input.startingStack, 'Starting stack'),
      late_registration_level: input.lateRegistrationLevel ?? null,
      notes: optionalText(input.notes),
    })
    .select()
    .single()
  throwIfError(error)

  const { error: levelsError } = await db.from('tournament_structure_levels').insert(
    input.levels.map((level, index) => ({
      structure_id: structure.id,
      level_number: level.levelNumber || index + 1,
      small_blind: nonNegativeMinorAmount(level.smallBlind, 'Small blind'),
      big_blind: nonNegativeMinorAmount(level.bigBlind, 'Big blind'),
      ante: nonNegativeMinorAmount(level.ante, 'Ante'),
      duration_seconds: level.durationSeconds,
      is_break: Boolean(level.isBreak),
      label: optionalText(level.label),
    }))
  )
  if (levelsError) {
    await db.from('tournament_structures').delete().eq('id', structure.id)
    throw new Error(errorMessage(levelsError))
  }
  const created = await loadTournamentStructures(input.leagueId)
  const match = created.find((entry) => entry.id === structure.id)
  if (!match) throw new Error('Tournament structure was created but could not be reloaded.')
  return match
}

function createGameTemplatePayload(
  input: CreateGameTemplateInput
): Record<string, unknown> {
  const minBuyIn = nonNegativeMinorAmount(input.minBuyInMinor ?? null, 'Minimum buy-in')
  const maxBuyIn = nonNegativeMinorAmount(input.maxBuyInMinor ?? null, 'Maximum buy-in')
  if (minBuyIn !== null && maxBuyIn !== null && BigInt(maxBuyIn) < BigInt(minBuyIn)) {
    throw new Error('Maximum buy-in must be at least the minimum buy-in.')
  }

  return {
    owner_id: input.ownerId,
    league_id: input.leagueId,
    name: requiredText(input.name, 'Template name'),
    kind: input.kind,
    timezone: requiredText(input.timezone ?? 'America/New_York', 'Timezone'),
    recurrence_rule: optionalText(input.recurrenceRule),
    capacity: validateCapacity(input.capacity),
    location: optionalText(input.location),
    currency: currencyCode(input.currency),
    buy_in_minor: nonNegativeMinorAmount(input.buyInMinor, 'Buy-in'),
    small_blind_minor: nonNegativeMinorAmount(
      input.smallBlindMinor ?? null,
      'Small blind'
    ),
    big_blind_minor: nonNegativeMinorAmount(input.bigBlindMinor ?? null, 'Big blind'),
    min_buy_in_minor: minBuyIn,
    max_buy_in_minor: maxBuyIn,
    entry_fee_minor: nonNegativeMinorAmount(input.entryFeeMinor, 'Entry fee'),
    rake_minor: nonNegativeMinorAmount(input.rakeMinor, 'Rake'),
    bounty_minor: nonNegativeMinorAmount(input.bountyMinor, 'Bounty'),
    payout_rules: input.payoutRules ?? {},
    reminder_schedule: input.reminderSchedule ?? [],
    structure_id: input.structureId ?? null,
  }
}

export async function replaceGameTemplateInvitees(
  templateId: string,
  invitees: { contactIds?: string[]; groupIds?: string[] }
): Promise<void> {
  const { error: deleteError } = await db
    .from('game_template_invitees')
    .delete()
    .eq('template_id', templateId)
  throwIfError(deleteError)

  const contactIds = uniqueIds(invitees.contactIds)
  const groupIds = uniqueIds(invitees.groupIds)
  const rows = [
    ...contactIds.map((contactId) => ({
      template_id: templateId,
      contact_id: contactId,
      group_id: null,
    })),
    ...groupIds.map((groupId) => ({
      template_id: templateId,
      contact_id: null,
      group_id: groupId,
    })),
  ]
  if (rows.length === 0) return

  const { error } = await db.from('game_template_invitees').insert(rows)
  throwIfError(error)
}

export async function createGameTemplate(
  input: CreateGameTemplateInput
): Promise<GameTemplateDetail> {
  const { data, error } = await db
    .from('game_templates')
    .insert(createGameTemplatePayload(input))
    .select()
    .single()
  throwIfError(error)
  const template = asGameTemplate(data)

  try {
    await replaceGameTemplateInvitees(template.id, {
      contactIds: input.contactIds,
      groupIds: input.groupIds,
    })
  } catch (inviteeError) {
    await db.from('game_templates').delete().eq('id', template.id)
    throw inviteeError
  }
  return loadGameTemplate(template.id)
}

export async function updateGameTemplate(
  templateId: string,
  changes: UpdateGameTemplateInput
): Promise<GameTemplateDetail> {
  const payload: Record<string, unknown> = {}
  if (changes.name !== undefined) {
    payload.name = requiredText(changes.name, 'Template name')
  }
  if (changes.kind !== undefined) payload.kind = changes.kind
  if (changes.timezone !== undefined) {
    payload.timezone = requiredText(changes.timezone, 'Timezone')
  }
  if (changes.recurrenceRule !== undefined) {
    payload.recurrence_rule = optionalText(changes.recurrenceRule)
  }
  if (changes.capacity !== undefined) payload.capacity = validateCapacity(changes.capacity)
  if (changes.location !== undefined) payload.location = optionalText(changes.location)
  if (changes.currency !== undefined) payload.currency = currencyCode(changes.currency)
  if (changes.buyInMinor !== undefined) {
    payload.buy_in_minor = nonNegativeMinorAmount(changes.buyInMinor, 'Buy-in')
  }
  if (changes.smallBlindMinor !== undefined) {
    payload.small_blind_minor = nonNegativeMinorAmount(
      changes.smallBlindMinor,
      'Small blind'
    )
  }
  if (changes.bigBlindMinor !== undefined) {
    payload.big_blind_minor = nonNegativeMinorAmount(changes.bigBlindMinor, 'Big blind')
  }
  if (changes.minBuyInMinor !== undefined) {
    payload.min_buy_in_minor = nonNegativeMinorAmount(
      changes.minBuyInMinor,
      'Minimum buy-in'
    )
  }
  if (changes.maxBuyInMinor !== undefined) {
    payload.max_buy_in_minor = nonNegativeMinorAmount(
      changes.maxBuyInMinor,
      'Maximum buy-in'
    )
  }
  if (changes.entryFeeMinor !== undefined) {
    payload.entry_fee_minor = nonNegativeMinorAmount(
      changes.entryFeeMinor,
      'Entry fee'
    )
  }
  if (changes.rakeMinor !== undefined) {
    payload.rake_minor = nonNegativeMinorAmount(changes.rakeMinor, 'Rake')
  }
  if (changes.bountyMinor !== undefined) {
    payload.bounty_minor = nonNegativeMinorAmount(changes.bountyMinor, 'Bounty')
  }
  if (changes.payoutRules !== undefined) payload.payout_rules = changes.payoutRules
  if (changes.reminderSchedule !== undefined) {
    payload.reminder_schedule = changes.reminderSchedule
  }
  if (changes.structureId !== undefined) payload.structure_id = changes.structureId

  if (Object.keys(payload).length === 0) return loadGameTemplate(templateId)
  const { data, error } = await db
    .from('game_templates')
    .update(payload)
    .eq('id', templateId)
    .select(TEMPLATE_WITH_INVITEES)
    .single()
  throwIfError(error)
  return asGameTemplateDetail(data)
}

export async function setGameTemplateArchived(
  templateId: string,
  archived: boolean
): Promise<GameTemplateDetail> {
  const { data, error } = await db
    .from('game_templates')
    .update({ is_archived: archived })
    .eq('id', templateId)
    .select(TEMPLATE_WITH_INVITEES)
    .single()
  throwIfError(error)
  return asGameTemplateDetail(data)
}

export async function deleteGameTemplate(templateId: string): Promise<void> {
  const { error } = await db.from('game_templates').delete().eq('id', templateId)
  throwIfError(error)
}

export async function loadSeasonGames(seasonId: string): Promise<HomeGame[]> {
  const { data, error } = await db
    .from('games')
    .select('*')
    .eq('season_id', seasonId)
    .order('scheduled_date', { ascending: false })
  throwIfError(error)
  return (data ?? []).map(asHomeGame)
}

export async function loadStandingsForSeason(
  seasonId: string,
  players: Player[]
): Promise<StandingEntry[]> {
  const { data: gameRows, error: gameError } = await db
    .from('games')
    .select('id, currency')
    .eq('season_id', seasonId)
    .eq('status', 'completed')
  throwIfError(gameError)

  const gameIds = (gameRows ?? []).map((game: { id: string }) => game.id)
  if (gameIds.length === 0) return []

  const currencyByGame = new Map<string, string>(
    (gameRows ?? []).map((game: { id: string; currency: string }) => [
      game.id,
      String(game.currency),
    ])
  )
  const { data, error } = await db
    .from('game_results')
    .select('*')
    .in('game_id', gameIds)
  throwIfError(error)

  const playerMap = new Map<string, StandingEntry>()
  for (const player of players) {
    playerMap.set(player.id, {
      playerId: player.id,
      displayName: player.display_name,
      avatarUrl: player.avatar_url,
      totalPoints: 0,
      gamesPlayed: 0,
      totalWinningsMinor: '0',
      netProfitMinor: '0',
      currency: null,
      wins: 0,
      rank: 0,
    })
  }

  for (const result of (data ?? []) as GameResult[]) {
    const entry = playerMap.get(result.player_id)
    if (!entry) continue
    entry.totalPoints += Number(result.points_earned)
    entry.gamesPlayed += 1
    const currency = currencyByGame.get(result.game_id)
    const financialsAvailable =
      result.data_quality === 'trusted'
      && result.total_buy_in_minor !== null
      && result.total_buy_in_minor !== undefined
      && result.payout_minor !== null
      && result.payout_minor !== undefined
      && Boolean(currency)
    if (
      !financialsAvailable
      || (entry.currency !== null && entry.currency !== currency)
      || entry.totalWinningsMinor === null
      || entry.netProfitMinor === null
    ) {
      entry.totalWinningsMinor = null
      entry.netProfitMinor = null
      entry.currency = null
    } else {
      entry.currency = currency ?? null
      entry.totalWinningsMinor = (
        BigInt(entry.totalWinningsMinor) + BigInt(result.payout_minor!)
      ).toString()
      entry.netProfitMinor = (
        BigInt(entry.netProfitMinor)
        + BigInt(result.payout_minor!)
        - BigInt(result.total_buy_in_minor!)
      ).toString()
    }
    if (result.finish_position === 1) entry.wins += 1
  }

  const sorted = [...playerMap.values()]
    .filter((entry) => entry.gamesPlayed > 0)
    .sort(
      (left, right) =>
        right.totalPoints - left.totalPoints ||
        right.wins - left.wins ||
        (
          right.netProfitMinor === null
            ? -1
            : left.netProfitMinor === null
              ? 1
              : BigInt(right.netProfitMinor) > BigInt(left.netProfitMinor)
                ? 1
                : BigInt(right.netProfitMinor) < BigInt(left.netProfitMinor)
                  ? -1
                  : 0
        )
    )
  sorted.forEach((entry, index) => {
    entry.rank = index + 1
  })
  return sorted
}

async function loadOptionalRows(
  table: string,
  gameId: string,
  orderColumn?: string
): Promise<Record<string, unknown>[]> {
  let query = db.from(table).select('*').eq('game_id', gameId)
  if (orderColumn) query = query.order(orderColumn)
  const { data, error } = await query
  if (error && isOptionalFeatureUnavailable(error)) return []
  throwIfError(error)
  return (data ?? []) as Record<string, unknown>[]
}

function mapParticipant(
  row: Record<string, unknown>,
  playerById: Map<string, Player>
): HomeParticipant {
  const playerId = String(row.player_id ?? '')
  const player = playerById.get(playerId)
  const joinedPlayer = asRecord(row.players)
  return {
    id: String(row.id ?? row.invite_id ?? playerId),
    game_id: String(row.game_id ?? ''),
    player_id: playerId,
    display_name:
      (typeof row.display_name === 'string' ? row.display_name : null) ??
      (typeof joinedPlayer.display_name === 'string' ? joinedPlayer.display_name : null) ??
      player?.display_name ??
      'Guest',
    rsvp_status: normalizeRsvp(row.rsvp_status),
    checked_in_at: stringOrNull(row.checked_in_at),
    guest_count: numberOrNull(row.guest_count) ?? 0,
    table_number: numberOrNull(row.table_number),
    seat_number: numberOrNull(row.seat_number),
    finish_position: numberOrNull(row.finish_position),
    eliminated_at: stringOrNull(row.eliminated_at),
  }
}

export async function loadGameWorkspace(
  userId: string,
  leagueId: string,
  gameId: string
): Promise<GameWorkspace> {
  const [
    gameResponse,
    leagueResponse,
    playerResponse,
    resultResponse,
    inviteResponse,
    access,
    participantRows,
    transactionRows,
    seatRows,
    blindRows,
    clockRows,
    resultVersionRows,
  ] = await Promise.all([
    db.from('games').select('*').eq('id', gameId).single(),
    db.from('leagues').select('*').eq('id', leagueId).single(),
    db.from('players').select('*').eq('league_id', leagueId).order('display_name'),
    db
      .from('game_results')
      .select('*')
      .eq('game_id', gameId)
      .order('finish_position'),
    db.from('game_invites').select('*').eq('game_id', gameId),
    getLeagueAccess(userId, leagueId),
    loadOptionalRows('game_participants', gameId, 'created_at'),
    loadOptionalRows('game_transactions', gameId, 'created_at'),
    loadOptionalRows('game_seats', gameId, 'table_number'),
    loadOptionalRows('tournament_levels', gameId, 'level_number'),
    loadOptionalRows('tournament_clocks', gameId),
    loadOptionalRows('game_result_versions', gameId, 'version'),
  ])

  throwIfError(gameResponse.error)
  throwIfError(leagueResponse.error)
  throwIfError(playerResponse.error)
  throwIfError(resultResponse.error)
  throwIfError(inviteResponse.error)

  const players = (playerResponse.data ?? []) as Player[]
  const invites = (inviteResponse.data ?? []) as GameInvite[]
  const playerById = new Map(players.map((player) => [player.id, player]))
  const participants =
    participantRows.length > 0
      ? participantRows.map((row) => mapParticipant(row, playerById))
      : invites.map((invite) =>
          mapParticipant(invite as unknown as Record<string, unknown>, playerById)
        )

  return {
    game: asHomeGame(gameResponse.data),
    league: leagueResponse.data as League,
    access,
    players,
    results: (resultResponse.data ?? []) as GameResult[],
    resultVersions: resultVersionRows.map((row) => ({
      id: String(row.id),
      game_id: String(row.game_id),
      player_id: String(row.player_id),
      version: Number(row.version),
      correction_of_id: stringOrNull(row.correction_of_id),
      finish_position: Number(row.finish_position),
      entry_minor: String(row.entry_minor ?? '0'),
      reentry_count: Number(row.reentry_count ?? 0),
      reentry_total_minor: String(row.reentry_total_minor ?? '0'),
      add_on_count: Number(row.add_on_count ?? 0),
      add_on_total_minor: String(row.add_on_total_minor ?? '0'),
      bounty_minor: String(row.bounty_minor ?? '0'),
      payout_minor: String(row.payout_minor ?? '0'),
      total_buy_in_minor: String(row.total_buy_in_minor ?? '0'),
      currency: String(row.currency ?? 'USD'),
      transaction_ids: Array.isArray(row.transaction_ids)
        ? row.transaction_ids.map(String)
        : [],
      is_post_finalization: Boolean(row.is_post_finalization),
      idempotency_key: String(row.idempotency_key ?? ''),
      created_by: String(row.created_by ?? ''),
      created_at: String(row.created_at ?? ''),
    })),
    invites,
    participants,
    transactions: transactionRows.map((row) => ({
      id: String(row.id),
      game_id: String(row.game_id),
      participant_id: stringOrNull(row.participant_id),
      player_id: stringOrNull(row.player_id),
      kind: row.kind as GameTransactionKind,
      amount_minor: String(row.amount_minor ?? '0'),
      currency: typeof row.currency === 'string' ? row.currency : 'USD',
      note: stringOrNull(row.note),
      created_at: String(row.created_at ?? ''),
      reversed_at: stringOrNull(row.reversed_at),
    })),
    seats: seatRows.map((row) => ({
      id: String(row.id),
      game_id: String(row.game_id),
      participant_id: String(row.participant_id),
      table_number: Number(row.table_number),
      seat_number: Number(row.seat_number),
      active: row.active !== false,
    })),
    blindLevels: blindRows.map((row) => ({
      id: String(row.id),
      game_id: String(row.game_id),
      level_number: Number(row.level_number),
      small_blind: Number(row.small_blind ?? 0),
      big_blind: Number(row.big_blind ?? 0),
      ante: Number(row.ante ?? 0),
      duration_seconds: Number(row.duration_seconds ?? 1200),
      is_break: Boolean(row.is_break),
      label: stringOrNull(row.label),
    })),
    clock: clockRows[0]
      ? {
          game_id: String(clockRows[0].game_id),
          current_level: Number(clockRows[0].current_level ?? 1),
          remaining_seconds: Number(clockRows[0].remaining_seconds ?? 1200),
          is_running: Boolean(clockRows[0].is_running),
          started_at: stringOrNull(clockRows[0].started_at),
          paused_at: stringOrNull(clockRows[0].paused_at),
          revision: String(clockRows[0].revision ?? '0'),
          updated_at: stringOrNull(clockRows[0].updated_at),
        }
      : null,
  }
}

export async function createLeague(input: {
  name: string
  description?: string
  ownerId: string
  pointsSystem: PointsSystem
  idempotencyKey: string
}): Promise<League> {
  const rpcResponse = await db.rpc('create_league', {
    p_name: input.name.trim(),
    p_description: input.description?.trim() || null,
    p_points_system: input.pointsSystem,
    p_idempotency_key: input.idempotencyKey,
  })

  if (rpcResponse.error) throw new Error(errorMessage(rpcResponse.error))
  const row = Array.isArray(rpcResponse.data) ? rpcResponse.data[0] : rpcResponse.data
  if (!row) throw new Error('League creation returned no league.')
  return row as League
}

export async function createSeason(input: {
  leagueId: string
  name: string
  startDate?: string
  endDate?: string
  makeActive?: boolean
}): Promise<Season> {
  if (input.startDate && input.endDate && input.startDate > input.endDate) {
    throw new Error('The season end date must be on or after its start date.')
  }

  const { data, error } = await db
    .from('seasons')
    .insert({
      league_id: input.leagueId,
      name: input.name.trim(),
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      is_active: false,
    })
    .select()
    .single()
  throwIfError(error)

  if (input.makeActive !== false) {
    try {
      await activateSeason(input.leagueId, data.id)
      data.is_active = true
    } catch (activationError) {
      await db.from('seasons').delete().eq('id', data.id)
      throw activationError
    }
  }
  return data as Season
}

export async function activateSeason(leagueId: string, seasonId: string): Promise<void> {
  const { error } = await db.rpc('set_active_season', {
    p_league_id: leagueId,
    p_season_id: seasonId,
  })
  if (error) throw new Error(errorMessage(error))
}

export async function createGameFromTemplate(
  input: CreateGameFromTemplateInput
): Promise<HomeGame> {
  const { data, error } = await db.rpc('create_game_from_template', {
    p_template_id: input.templateId,
    p_scheduled_at: parseLocalDateTime(input.scheduledDate),
    p_title: optionalText(input.title),
    p_idempotency_key: input.idempotencyKey,
  })
  if (error) throw new Error(errorMessage(error))
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('Game creation returned no game.')
  return asHomeGame(row)
}

export async function scheduleGame(input: ScheduleGameInput): Promise<HomeGame> {
  return createGameFromTemplate(input)
}

export async function transitionGamePhase(game: HomeGame, phase: GamePhase): Promise<HomeGame> {
  if (game.phase === 'finalized') {
    throw new Error('Finalized games are locked. Record an adjustment instead of reopening the game.')
  }
  const expandedResponse = await db
    .from('games')
    .update({ phase, status: legacyStatusForPhase(phase) })
    .eq('id', game.id)
    .select()
    .single()
  if (!expandedResponse.error) return asHomeGame(expandedResponse.data)
  if (!isOptionalFeatureUnavailable(expandedResponse.error)) {
    throw new Error(errorMessage(expandedResponse.error))
  }

  const { data, error } = await db
    .from('games')
    .update({ status: legacyStatusForPhase(phase) })
    .eq('id', game.id)
    .select()
    .single()
  throwIfError(error)
  return asHomeGame(data)
}

export async function updateRsvp(
  inviteId: string,
  status: HomeRsvpStatus
): Promise<void> {
  const { error } = await db
    .from('game_invites')
    .update({
      rsvp_status: status,
      responded_at: status === 'pending' ? null : new Date().toISOString(),
    })
    .eq('id', inviteId)
  throwIfError(error)
}

export async function addPlayersToGame(gameId: string, playerIds: string[]): Promise<void> {
  if (playerIds.length === 0) return
  const { error } = await db.from('game_invites').upsert(
    playerIds.map((playerId) => ({
      game_id: gameId,
      player_id: playerId,
      rsvp_status: 'pending',
    })),
    { onConflict: 'game_id,player_id', ignoreDuplicates: true }
  )
  throwIfError(error)
}

export async function setParticipantCheckIn(
  participant: HomeParticipant,
  checkedIn: boolean,
  idempotencyKey: string
): Promise<void> {
  const { error } = await db.rpc('set_game_check_in', {
    p_game_id: participant.game_id,
    p_participant_id: participant.id,
    p_checked_in: checkedIn,
    p_idempotency_key: idempotencyKey,
  })
  if (error) throw new Error(errorMessage(error))
}

export async function issueSecureInvite(gameId: string): Promise<{
  token: string
  expiresAt: string | null
}> {
  const { data, error } = await supabase.functions.invoke('guest-invite', {
    body: { action: 'issue', gameId },
  })
  if (!error && data?.token) {
    return {
      token: String(data.token),
      expiresAt: stringOrNull(data.expiresAt),
    }
  }
  throw new Error(errorMessage(error, 'Secure guest invitations are unavailable.'))
}

export function inviteUrl(token: string): string {
  return `${window.location.origin}/i/${encodeURIComponent(token)}`
}

export async function recordGameTransaction(
  input: RecordTransactionInput
): Promise<GameTransaction> {
  const { data, error } = await db.rpc('record_game_transaction', {
    p_game_id: input.gameId,
    p_participant_id: input.participantId ?? null,
    p_player_id: input.playerId ?? null,
    p_kind: input.kind,
    p_amount_minor: input.amountMinor,
    p_currency: input.currency,
    p_note: input.note?.trim() || null,
    p_idempotency_key: input.idempotencyKey,
  })
  if (error) throw new Error(errorMessage(error))
  const row = asRecord(Array.isArray(data) ? data[0] : data)
  return {
    id: String(row.id),
    game_id: String(row.game_id ?? input.gameId),
    participant_id: stringOrNull(row.participant_id),
    player_id: stringOrNull(row.player_id),
    kind: (row.kind as GameTransactionKind) ?? input.kind,
    amount_minor: String(row.amount_minor ?? input.amountMinor),
    currency: typeof row.currency === 'string' ? row.currency : input.currency,
    note: stringOrNull(row.note),
    created_at: String(row.created_at ?? new Date().toISOString()),
    reversed_at: stringOrNull(row.reversed_at),
  }
}

export async function assignSeat(input: {
  gameId: string
  participantId: string
  tableNumber: number
  seatNumber: number
}): Promise<void> {
  if (input.tableNumber < 1 || input.seatNumber < 1) {
    throw new Error('Table and seat numbers must be at least 1.')
  }
  const { error } = await db.from('game_seats').upsert(
    {
      game_id: input.gameId,
      participant_id: input.participantId,
      table_number: input.tableNumber,
      seat_number: input.seatNumber,
      active: true,
    },
    { onConflict: 'game_id,participant_id' }
  )
  throwIfError(error)
}

export async function recordTournamentFinish(input: {
  gameId: string
  participantId: string
  finishPosition: number
  eliminatedByParticipantId?: string | null
  bountyMinor?: string
  note?: string
}): Promise<void> {
  if (!Number.isInteger(input.finishPosition) || input.finishPosition < 1) {
    throw new Error('Finish position must be a positive whole number.')
  }
  const { data: previous, error: previousError } = await db
    .from('game_participants')
    .select('finish_position, eliminated_at')
    .eq('id', input.participantId)
    .eq('game_id', input.gameId)
    .single()
  throwIfError(previousError)
  const eliminatedAt = input.finishPosition === 1 ? null : new Date().toISOString()
  const { error: participantError } = await db
    .from('game_participants')
    .update({
      finish_position: input.finishPosition,
      eliminated_at: eliminatedAt,
    })
    .eq('id', input.participantId)
    .eq('game_id', input.gameId)
  throwIfError(participantError)

  if (input.finishPosition === 1) return
  const { error } = await db.from('game_eliminations').upsert(
    {
      game_id: input.gameId,
      participant_id: input.participantId,
      eliminated_by_participant_id: input.eliminatedByParticipantId ?? null,
      bounty_minor: input.bountyMinor ?? '0',
      occurred_at: eliminatedAt,
      note: optionalText(input.note),
    },
    { onConflict: 'game_id,participant_id' }
  )
  if (error) {
    await db
      .from('game_participants')
      .update({
        finish_position: previous.finish_position,
        eliminated_at: previous.eliminated_at,
      })
      .eq('id', input.participantId)
    throw new Error(errorMessage(error))
  }
}

export async function finalizeGame(gameId: string, idempotencyKey: string): Promise<void> {
  const { error } = await db.rpc('finalize_game', {
    p_game_id: gameId,
    p_idempotency_key: idempotencyKey,
  })
  if (error) throw new Error(errorMessage(error))
}

export async function linkFinalizedGameToCareer(input: {
  ownerId: string
  workspace: GameWorkspace
}): Promise<'created' | 'existing'> {
  const { ownerId, workspace } = input
  if (workspace.game.phase !== 'finalized') {
    throw new Error('Finalize the game before linking it to My Poker.')
  }
  const player = workspace.players.find((entry) => entry.user_id === ownerId)
  const result = player
    ? workspace.results.find((entry) => entry.player_id === player.id)
    : undefined
  if (!player || !result) {
    throw new Error('Your account does not have a player result in this game.')
  }

  const { data: existing, error: existingError } = await db
    .from('career_sessions')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('home_game_id', workspace.game.id)
    .maybeSingle()
  throwIfError(existingError)
  if (existing) return 'existing'

  if (
    result.data_quality !== 'trusted'
    || result.total_buy_in_minor === null
    || result.total_buy_in_minor === undefined
    || result.payout_minor === null
    || result.payout_minor === undefined
  ) {
    throw new Error('This result needs trusted minor-unit totals before it can be linked.')
  }
  const totalBuyInMinor = result.total_buy_in_minor
  const payoutMinor = result.payout_minor
  const stakes =
    workspace.game.kind === 'cash'
      ? [workspace.game.small_blind, workspace.game.big_blind]
          .filter((value) => value !== null)
          .join('/')
      : `${workspace.game.currency} ${Number(workspace.game.buy_in).toFixed(2)}`
  const { error } = await db.from('career_sessions').insert({
    owner_id: ownerId,
    home_game_id: workspace.game.id,
    session_kind: workspace.game.kind,
    medium: 'live',
    played_at: workspace.game.scheduled_date,
    venue: workspace.game.location,
    game_variant: 'Poker',
    stakes: stakes || null,
    entries: Math.max(1, Number(result.rebuys) + 1),
    buy_in_minor: totalBuyInMinor,
    fees_minor: 0,
    payout_minor: payoutMinor,
    currency: workspace.game.currency,
    timezone: 'America/New_York',
    notes: `Linked from ${gameDisplayName(workspace.game, workspace.league.name)}.`,
    tags: ['home-game'],
    data_quality:
      result.data_quality ??
      (Number(result.rebuys) > 0 ? 'legacy_incomplete' : 'trusted'),
  })
  if (error?.code === '23505') return 'existing'
  throwIfError(error)
  return 'created'
}

export function amountToMinorUnits(value: string): string {
  const normalized = value.trim().replace(/[$,\s]/g, '')
  if (!/^-?\d*(?:\.\d{0,2})?$/.test(normalized) || normalized === '' || normalized === '-') {
    throw new Error('Enter a valid amount with no more than two decimal places.')
  }
  const negative = normalized.startsWith('-')
  const unsigned = negative ? normalized.slice(1) : normalized
  const [whole = '0', fraction = ''] = unsigned.split('.')
  const amount = BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0') || '0')
  return String(negative ? -amount : amount)
}

export function formatMinorUnits(amountMinor: string | bigint, currency = 'USD'): string {
  return formatMoney(money(amountMinor, currency))
}
