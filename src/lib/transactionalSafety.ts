import { z } from 'zod'
import { AppError, errorMessage } from './errors'
import { supabase } from './supabase'

const minorUnitSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)$/, 'Use a non-negative integer minor-unit amount.')

const percentagePlaceSchema = z.object({
  place: z.number().int().positive(),
  basisPoints: z.number().int().positive().max(10_000),
})

const fixedPlaceSchema = z.object({
  place: z.number().int().positive(),
  amountMinor: minorUnitSchema,
})

function addPlaceIssues(
  places: ReadonlyArray<{ place: number }>,
  context: z.core.$RefinementCtx,
) {
  const ordered = [...places].map(({ place }) => place).sort((a, b) => a - b)
  if (new Set(ordered).size !== ordered.length) {
    context.addIssue({
      code: 'custom',
      message: 'Payout places must be unique.',
      path: ['places'],
    })
  }
  if (ordered.some((place, index) => place !== index + 1)) {
    context.addIssue({
      code: 'custom',
      message: 'Payout places must be contiguous starting at first place.',
      path: ['places'],
    })
  }
}

export const payoutRuleSchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal('percentage'),
      places: z.array(percentagePlaceSchema).min(1),
    }),
    z.object({
      type: z.literal('fixed'),
      places: z.array(fixedPlaceSchema).min(1),
    }),
  ])
  .superRefine((rule, context) => {
    addPlaceIssues(rule.places, context)
    if (
      rule.type === 'percentage'
      && rule.places.reduce((total, place) => total + place.basisPoints, 0) !== 10_000
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Percentage payout basis points must total exactly 10,000.',
        path: ['places'],
      })
    }
  })

export type PayoutRule = z.infer<typeof payoutRuleSchema>

export interface LeagueDeletionReceipt {
  league_id: string
  deleted_at: string
}

export interface GameResultVersion {
  id: string
  game_id: string
  player_id: string
  version: number
  correction_of_id: string | null
  finish_position: number
  entry_minor: string
  reentry_count: number
  reentry_total_minor: string
  add_on_count: number
  add_on_total_minor: string
  bounty_minor: string
  payout_minor: string
  total_buy_in_minor: string
  currency: string
  transaction_ids: string[]
  is_post_finalization: boolean
  idempotency_key: string
  created_by: string
  created_at: string
}

export interface GameTransactionReversal {
  id: string
  game_id: string
  reversal_of_id: string
  effect_multiplier: -1
  reversed_at: string
  idempotency_key: string
}

export interface TournamentClock {
  game_id: string
  current_level: number
  remaining_seconds: number
  is_running: boolean
  started_at: string | null
  paused_at: string | null
  revision: string
  updated_at: string
}

export type TournamentClockCommand = 'start' | 'pause' | 'advance' | 'reset'

export interface RecordGameResultInput {
  gameId: string
  playerId: string
  finishPosition: number
  entryMinor: string
  reentryCount: number
  reentryTotalMinor: string
  addOnCount: number
  addOnTotalMinor: string
  bountyMinor: string
  payoutMinor: string
  currency: string
  correctsVersionId?: string | null
  idempotencyKey: string
}

const recordGameResultSchema = z.object({
  gameId: z.string().uuid(),
  playerId: z.string().uuid(),
  finishPosition: z.number().int().positive(),
  entryMinor: minorUnitSchema,
  reentryCount: z.number().int().nonnegative(),
  reentryTotalMinor: minorUnitSchema,
  addOnCount: z.number().int().nonnegative(),
  addOnTotalMinor: minorUnitSchema,
  bountyMinor: minorUnitSchema,
  payoutMinor: minorUnitSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  correctsVersionId: z.string().uuid().nullable().optional(),
  idempotencyKey: z.string().trim().min(1),
}).superRefine((input, context) => {
  const reentryTotal = BigInt(input.reentryTotalMinor)
  if ((input.reentryCount === 0) !== (reentryTotal === 0n)) {
    context.addIssue({
      code: 'custom',
      message: 'Re-entry count and total must both be zero or both be positive.',
      path: ['reentryTotalMinor'],
    })
  }
  const addOnTotal = BigInt(input.addOnTotalMinor)
  if ((input.addOnCount === 0) !== (addOnTotal === 0n)) {
    context.addIssue({
      code: 'custom',
      message: 'Add-on count and total must both be zero or both be positive.',
      path: ['addOnTotalMinor'],
    })
  }
})

function oneRow<T>(data: unknown, fallback: string): T {
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new AppError(fallback, 'UNKNOWN')
  return row as T
}

function serializePayoutRule(rule: PayoutRule) {
  if (rule.type === 'percentage') {
    return {
      type: rule.type,
      places: rule.places.map((place) => ({
        place: place.place,
        basis_points: place.basisPoints,
      })),
    }
  }
  return {
    type: rule.type,
    places: rule.places.map((place) => ({
      place: place.place,
      // Strings preserve the full bigint range through JSON/PostgREST.
      amount_minor: place.amountMinor,
    })),
  }
}

export function validateFixedPayoutTotal(
  rule: Extract<PayoutRule, { type: 'fixed' }>,
  availablePoolMinor: string,
) {
  const parsed = payoutRuleSchema.parse(rule)
  if (parsed.type !== 'fixed') throw new AppError('Expected fixed payout rules.', 'VALIDATION')
  const allocated = parsed.places.reduce(
    (total, place) => total + BigInt(place.amountMinor),
    0n,
  )
  if (allocated !== BigInt(minorUnitSchema.parse(availablePoolMinor))) {
    throw new AppError(
      'Fixed payouts must equal the available payout pool.',
      'VALIDATION',
    )
  }
  return parsed
}

export async function deleteLeagueTransactionally(input: {
  leagueId: string
  confirmationName: string
  idempotencyKey: string
}): Promise<LeagueDeletionReceipt> {
  const { data, error } = await supabase.rpc('delete_league', {
    p_league_id: input.leagueId,
    p_confirmation_name: input.confirmationName,
    p_idempotency_key: input.idempotencyKey,
  })
  if (error) throw new AppError(errorMessage(error), 'UNKNOWN', error)
  return oneRow<LeagueDeletionReceipt>(data, 'League deletion returned no receipt.')
}

export async function recordGameResultTransactionally(
  input: RecordGameResultInput,
): Promise<GameResultVersion> {
  const parsed = recordGameResultSchema.parse(input)
  const { data, error } = await supabase.rpc('record_game_result', {
    p_game_id: parsed.gameId,
    p_player_id: parsed.playerId,
    p_finish_position: parsed.finishPosition,
    p_entry_minor: parsed.entryMinor,
    p_reentry_count: parsed.reentryCount,
    p_reentry_total_minor: parsed.reentryTotalMinor,
    p_add_on_count: parsed.addOnCount,
    p_add_on_total_minor: parsed.addOnTotalMinor,
    p_bounty_minor: parsed.bountyMinor,
    p_payout_minor: parsed.payoutMinor,
    p_currency: parsed.currency,
    p_corrects_version_id: parsed.correctsVersionId ?? null,
    p_idempotency_key: parsed.idempotencyKey,
  })
  if (error) throw new AppError(errorMessage(error), 'UNKNOWN', error)
  return oneRow<GameResultVersion>(data, 'Result recording returned no version.')
}

export async function reverseGameTransaction(input: {
  gameId: string
  transactionId: string
  note?: string | null
  idempotencyKey: string
}): Promise<GameTransactionReversal> {
  const { data, error } = await supabase.rpc('reverse_game_transaction', {
    p_game_id: input.gameId,
    p_transaction_id: input.transactionId,
    p_note: input.note ?? null,
    p_idempotency_key: input.idempotencyKey,
  })
  if (error) throw new AppError(errorMessage(error), 'UNKNOWN', error)
  return oneRow<GameTransactionReversal>(data, 'Reversal returned no transaction.')
}

export async function allocateGamePayouts(
  gameId: string,
  input: PayoutRule,
): Promise<Array<{ finishPosition: number; amountMinor: string }>> {
  const rule = payoutRuleSchema.parse(input)
  const { data, error } = await supabase.rpc('allocate_game_payouts', {
    p_game_id: gameId,
    p_rules: serializePayoutRule(rule),
  })
  if (error) throw new AppError(errorMessage(error), 'UNKNOWN', error)
  return ((data ?? []) as Array<{ finish_position: number; amount_minor: string }>).map(
    (allocation) => ({
      finishPosition: allocation.finish_position,
      amountMinor: allocation.amount_minor,
    }),
  )
}

export async function commandTournamentClock(input: {
  gameId: string
  command: TournamentClockCommand
  expectedRevision: string | number
  idempotencyKey: string
}): Promise<TournamentClock> {
  const { data, error } = await supabase.rpc('command_tournament_clock', {
    p_game_id: input.gameId,
    p_command: input.command,
    p_expected_revision: String(input.expectedRevision),
    p_idempotency_key: input.idempotencyKey,
  })
  if (error) throw new AppError(errorMessage(error), 'UNKNOWN', error)
  return oneRow<TournamentClock>(data, 'Clock command returned no state.')
}
