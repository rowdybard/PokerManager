import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseMocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  functionsInvoke: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    rpc: supabaseMocks.rpc,
    from: supabaseMocks.from,
    functions: { invoke: supabaseMocks.functionsInvoke },
  },
}))

import {
  amountToMinorUnits,
  asGameTemplate,
  asHomeGame,
  createGameFromTemplate,
  createLeague,
  formatMinorUnits,
  normalizeRsvp,
  setParticipantCheckIn,
  summarizeCloseout,
} from './homeGames'

describe('home-game normalization helpers', () => {
  it('uses the canonical RSVP states while reading legacy values safely', () => {
    expect(normalizeRsvp('pending')).toBe('pending')
    expect(normalizeRsvp('confirmed')).toBe('yes')
    expect(normalizeRsvp('declined')).toBe('no')
    expect(normalizeRsvp('maybe')).toBe('maybe')
    expect(normalizeRsvp('waitlisted')).toBe('waitlisted')
    expect(normalizeRsvp('unexpected')).toBe('pending')
  })

  it('normalizes legacy games and template minor units', () => {
    expect(
      asHomeGame({
        id: 'game-1',
        league_id: 'league-1',
        season_id: 'season-1',
        status: 'completed',
        kind: 'cash',
        scheduled_date: '2026-07-26T00:00:00.000Z',
      }),
    ).toMatchObject({
      id: 'game-1',
      kind: 'cash',
      phase: 'finalized',
      currency: 'USD',
    })

    expect(
      asGameTemplate({
        id: 'template-1',
        owner_id: 'owner-1',
        league_id: 'league-1',
        name: 'Friday cash',
        kind: 'cash',
        buy_in_minor: 9007199254740993n,
        entry_fee_minor: 0,
        rake_minor: 0,
        bounty_minor: 0,
      }),
    ).toMatchObject({
      buy_in_minor: '9007199254740993',
      currency: 'USD',
      timezone: 'America/New_York',
    })
  })

  it('reconciles active transaction inflows, outflows, and signed adjustments', () => {
    const summary = summarizeCloseout([
      {
        id: '1',
        game_id: 'game-1',
        participant_id: null,
        player_id: null,
        kind: 'buy_in',
        amount_minor: '10000',
        currency: 'USD',
        note: null,
        created_at: '',
        reversed_at: null,
      },
      {
        id: '2',
        game_id: 'game-1',
        participant_id: null,
        player_id: null,
        kind: 'cash_out',
        amount_minor: '9500',
        currency: 'USD',
        note: null,
        created_at: '',
        reversed_at: null,
      },
      {
        id: '3',
        game_id: 'game-1',
        participant_id: null,
        player_id: null,
        kind: 'adjustment',
        amount_minor: '-500',
        currency: 'USD',
        note: null,
        created_at: '',
        reversed_at: null,
      },
      {
        id: '4',
        game_id: 'game-1',
        participant_id: null,
        player_id: null,
        kind: 'reload',
        amount_minor: '5000',
        currency: 'USD',
        note: null,
        created_at: '',
        reversed_at: '2026-07-26T01:00:00.000Z',
      },
    ])

    expect(summary).toEqual({
      inflowMinor: 10000n,
      outflowMinor: 10000n,
      varianceMinor: 0n,
      activeEntries: 1,
    })
  })

  it('parses and formats exact minor-unit amounts without Number coercion', () => {
    expect(amountToMinorUnits('$1,234.50')).toBe('123450')
    expect(amountToMinorUnits('-0.07')).toBe('-7')
    expect(() => amountToMinorUnits('10.001')).toThrow(/valid amount/)
    expect(formatMinorUnits('9007199254740993', 'USD')).toBe(
      '$90,071,992,547,409.93',
    )
  })
})

describe('home-game atomic RPC mutations', () => {
  beforeEach(() => {
    supabaseMocks.rpc.mockReset()
    supabaseMocks.from.mockReset()
  })

  it('creates leagues exclusively through create_league', async () => {
    const league = {
      id: 'league-1',
      name: 'Friday league',
      description: null,
      owner_id: 'owner-1',
      points_system: { type: 'position' as const },
      created_at: '2026-07-26T00:00:00.000Z',
    }
    supabaseMocks.rpc.mockResolvedValue({ data: league, error: null })

    await expect(
      createLeague({
        name: ' Friday league ',
        ownerId: 'owner-1',
        pointsSystem: { type: 'position' },
        idempotencyKey: 'league:create:1',
      }),
    ).resolves.toEqual(league)
    expect(supabaseMocks.rpc).toHaveBeenCalledWith('create_league', {
      p_name: 'Friday league',
      p_description: null,
      p_points_system: { type: 'position' },
      p_idempotency_key: 'league:create:1',
    })
    expect(supabaseMocks.from).not.toHaveBeenCalled()
  })

  it('does not fall back to direct writes when an atomic RPC is unavailable', async () => {
    supabaseMocks.rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Function not found' },
    })

    await expect(
      createLeague({
        name: 'Friday league',
        ownerId: 'owner-1',
        pointsSystem: { type: 'position' },
        idempotencyKey: 'league:create:2',
      }),
    ).rejects.toThrow('Function not found')
    expect(supabaseMocks.from).not.toHaveBeenCalled()
  })

  it('creates games from templates with an idempotency key', async () => {
    supabaseMocks.rpc.mockResolvedValue({
      data: {
        id: 'game-1',
        league_id: 'league-1',
        season_id: 'season-1',
        title: 'Friday cash',
        kind: 'cash',
        phase: 'inviting',
        status: 'scheduled',
        currency: 'USD',
        scheduled_date: '2026-07-26T23:00:00.000Z',
      },
      error: null,
    })

    await expect(
      createGameFromTemplate({
        templateId: 'template-1',
        scheduledDate: '2026-07-26T23:00:00.000Z',
        title: ' Friday cash ',
        idempotencyKey: 'game:create:1',
      }),
    ).resolves.toMatchObject({ id: 'game-1', phase: 'inviting', kind: 'cash' })
    expect(supabaseMocks.rpc).toHaveBeenCalledWith('create_game_from_template', {
      p_template_id: 'template-1',
      p_scheduled_at: '2026-07-26T23:00:00.000Z',
      p_title: 'Friday cash',
      p_idempotency_key: 'game:create:1',
    })
  })

  it('checks players in exclusively through the idempotent RPC', async () => {
    supabaseMocks.rpc.mockResolvedValue({ data: {}, error: null })
    await setParticipantCheckIn(
      {
        id: 'participant-1',
        game_id: 'game-1',
        player_id: 'player-1',
        display_name: 'Ace',
        rsvp_status: 'yes',
        checked_in_at: null,
        guest_count: 0,
        table_number: null,
        seat_number: null,
      },
      true,
      'checkin:1',
    )
    expect(supabaseMocks.rpc).toHaveBeenCalledWith('set_game_check_in', {
      p_game_id: 'game-1',
      p_participant_id: 'participant-1',
      p_checked_in: true,
      p_idempotency_key: 'checkin:1',
    })
    expect(supabaseMocks.from).not.toHaveBeenCalled()
  })
})
