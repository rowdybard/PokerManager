import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))
vi.mock('./env', () => ({ env: { plaidEnabled: false } }))
import {
  calculateCareerMetrics,
  parseStandardBigBlindMinor,
  type CareerSession,
  type DashboardData,
} from './pro'

function session(
  changes: Partial<CareerSession> & Pick<CareerSession, 'id' | 'session_kind' | 'profit_minor'>,
): CareerSession {
  const { id, session_kind, profit_minor, ...rest } = changes
  return {
    id,
    owner_id: '00000000-0000-4000-8000-000000000001',
    session_kind,
    medium: 'live',
    played_at: '2026-01-01T12:00:00.000Z',
    ended_at: null,
    venue: 'Test room',
    game_variant: "No-Limit Hold'em",
    stakes: null,
    duration_minutes: null,
    hands_played: null,
    entries: 1,
    buy_in_minor: '0',
    fees_minor: '0',
    payout_minor: '0',
    profit_minor,
    currency: 'USD',
    timezone: 'UTC',
    notes: null,
    tags: [],
    data_quality: 'trusted',
    created_at: '2026-01-01T12:00:00.000Z',
    ...rest,
  }
}

describe('parseStandardBigBlindMinor', () => {
  it('parses only standard small-blind/big-blind labels', () => {
    expect(parseStandardBigBlindMinor('$2/$5', 'USD')).toBe('500')
    expect(parseStandardBigBlindMinor('0.50/1', 'USD')).toBe('100')
    expect(parseStandardBigBlindMinor('2 / 5', 'USD')).toBe('500')
    expect(parseStandardBigBlindMinor('2/5 NLH', 'USD')).toBeNull()
    expect(parseStandardBigBlindMinor('5 bring-in', 'USD')).toBeNull()
  })
})

describe('calculateCareerMetrics', () => {
  it('calculates weighted bb rates, ABI, and tournament entry volume', () => {
    const data: DashboardData = {
      sessions: [
        session({
          id: 'cash-1',
          session_kind: 'cash',
          profit_minor: '10000',
          payout_minor: '30000',
          buy_in_minor: '20000',
          stakes: '$2/$5',
          hands_played: 100,
          duration_minutes: 120,
        }),
        session({
          id: 'cash-2',
          session_kind: 'cash',
          profit_minor: '-5000',
          payout_minor: '5000',
          buy_in_minor: '10000',
          stakes: '0.50/1',
          hands_played: 100,
          duration_minutes: 60,
          played_at: '2026-01-02T12:00:00.000Z',
        }),
        session({
          id: 'tournament-1',
          session_kind: 'tournament',
          profit_minor: '10000',
          buy_in_minor: '10000',
          payout_minor: '20000',
          entries: 1,
          duration_minutes: 180,
          played_at: '2026-01-03T12:00:00.000Z',
        }),
        session({
          id: 'tournament-2',
          session_kind: 'tournament',
          profit_minor: '-30000',
          buy_in_minor: '30000',
          payout_minor: '0',
          entries: 3,
          duration_minutes: 240,
          played_at: '2026-01-04T12:00:00.000Z',
        }),
      ],
      accounts: [],
      ledger: [],
      goals: [],
      upcomingEvents: [],
    }

    const metrics = calculateCareerMetrics(data)

    expect(metrics.bbPer100).toBe(-15)
    expect(metrics.bbPerHour).toBe(-10)
    expect(metrics.abiMinor).toBe('10000')
    expect(metrics.tournamentEntries).toBe(4)
    expect(metrics.sessionCount).toBe(4)
  })

  it('excludes legacy-incomplete and other-currency sessions', () => {
    const data: DashboardData = {
      sessions: [
        session({
          id: 'trusted',
          session_kind: 'cash',
          profit_minor: '5000',
          payout_minor: '15000',
          buy_in_minor: '10000',
        }),
        session({
          id: 'legacy',
          session_kind: 'cash',
          profit_minor: '999999',
          payout_minor: '999999',
          data_quality: 'legacy_incomplete',
        }),
        session({
          id: 'eur',
          session_kind: 'cash',
          profit_minor: '5000',
          payout_minor: '5000',
          currency: 'EUR',
        }),
      ],
      accounts: [],
      ledger: [],
      goals: [],
      upcomingEvents: [],
    }

    expect(calculateCareerMetrics(data, 'USD').totalProfitMinor).toBe('5000')
  })
})
