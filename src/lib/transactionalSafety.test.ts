import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpcMock = vi.hoisted(() => vi.fn())

vi.mock('./supabase', () => ({
  supabase: { rpc: rpcMock },
}))

import {
  commandTournamentClock,
  payoutRuleSchema,
  recordGameResultTransactionally,
  validateFixedPayoutTotal,
} from './transactionalSafety'

describe('transactional safety client contracts', () => {
  beforeEach(() => {
    rpcMock.mockReset()
  })

  it('requires percentage basis points to total exactly ten thousand', () => {
    expect(() => payoutRuleSchema.parse({
      type: 'percentage',
      places: [
        { place: 1, basisPoints: 5000 },
        { place: 2, basisPoints: 4999 },
      ],
    })).toThrow('10,000')

    expect(payoutRuleSchema.parse({
      type: 'percentage',
      places: [
        { place: 1, basisPoints: 5000 },
        { place: 2, basisPoints: 5000 },
      ],
    })).toMatchObject({ type: 'percentage' })
  })

  it('requires unique contiguous payout places', () => {
    expect(() => payoutRuleSchema.parse({
      type: 'percentage',
      places: [
        { place: 1, basisPoints: 5000 },
        { place: 3, basisPoints: 5000 },
      ],
    })).toThrow('contiguous')
  })

  it('checks fixed allocations with integer minor-unit arithmetic', () => {
    expect(validateFixedPayoutTotal({
      type: 'fixed',
      places: [
        { place: 1, amountMinor: '9007199254740993' },
        { place: 2, amountMinor: '7' },
      ],
    }, '9007199254741000')).toMatchObject({ type: 'fixed' })

    expect(() => validateFixedPayoutTotal({
      type: 'fixed',
      places: [{ place: 1, amountMinor: '99' }],
    }, '100')).toThrow('available payout pool')
  })

  it('sends every result money component as an exact RPC argument', async () => {
    rpcMock.mockResolvedValue({
      data: {
        id: '58000000-0000-4000-8000-000000000001',
        version: 1,
      },
      error: null,
    })

    await recordGameResultTransactionally({
      gameId: '55000000-0000-4000-8000-000000000001',
      playerId: '54000000-0000-4000-8000-000000000001',
      finishPosition: 1,
      entryMinor: '10000',
      reentryCount: 1,
      reentryTotalMinor: '2000',
      addOnCount: 1,
      addOnTotalMinor: '1000',
      bountyMinor: '500',
      payoutMinor: '12500',
      currency: 'USD',
      correctsVersionId: null,
      idempotencyKey: 'result:v1',
    })

    expect(rpcMock).toHaveBeenCalledWith('record_game_result', {
      p_game_id: '55000000-0000-4000-8000-000000000001',
      p_player_id: '54000000-0000-4000-8000-000000000001',
      p_finish_position: 1,
      p_entry_minor: '10000',
      p_reentry_count: 1,
      p_reentry_total_minor: '2000',
      p_add_on_count: 1,
      p_add_on_total_minor: '1000',
      p_bounty_minor: '500',
      p_payout_minor: '12500',
      p_currency: 'USD',
      p_corrects_version_id: null,
      p_idempotency_key: 'result:v1',
    })
  })

  it('sends the expected clock revision as a bigint-safe string', async () => {
    rpcMock.mockResolvedValue({
      data: {
        game_id: '55000000-0000-4000-8000-000000000001',
        revision: '9007199254740993',
      },
      error: null,
    })

    await commandTournamentClock({
      gameId: '55000000-0000-4000-8000-000000000001',
      command: 'pause',
      expectedRevision: '9007199254740992',
      idempotencyKey: 'clock:pause',
    })

    expect(rpcMock).toHaveBeenCalledWith('command_tournament_clock', {
      p_game_id: '55000000-0000-4000-8000-000000000001',
      p_command: 'pause',
      p_expected_revision: '9007199254740992',
      p_idempotency_key: 'clock:pause',
    })
  })
})
