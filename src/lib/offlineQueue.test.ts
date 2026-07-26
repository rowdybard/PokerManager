import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cacheActiveEvent,
  clearCachedActiveEvent,
  clearOfflineActionsForTests,
  enqueueOfflineAction,
  flushOfflineActions,
  getCachedActiveEvent,
  listOfflineActions,
} from './offlineQueue'

describe('offline host action queue', () => {
  beforeEach(async () => {
    await clearOfflineActionsForTests()
    await clearCachedActiveEvent()
    vi.stubGlobal('indexedDB', undefined)
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true)
  })

  it('deduplicates actions using the caller idempotency key', async () => {
    const first = await enqueueOfflineAction('check_in', { playerId: 'player-1' }, 'same-key')
    const duplicate = await enqueueOfflineAction(
      'check_in',
      { playerId: 'player-1' },
      'same-key',
    )

    expect(duplicate.id).toBe(first.id)
    expect(await listOfflineActions()).toHaveLength(1)
  })

  it('replays in order and removes successful entries', async () => {
    await enqueueOfflineAction('check_in', { sequence: 1 }, 'key-1')
    await enqueueOfflineAction('game_transaction', { sequence: 2 }, 'key-2')
    const seen: number[] = []

    const result = await flushOfflineActions(async (action) => {
      seen.push(action.payload.sequence as number)
    })

    expect(seen).toEqual([1, 2])
    expect(result).toEqual({ processed: 2, remaining: 0 })
    expect(await listOfflineActions()).toEqual([])
  })

  it('retains a failed action and all later entries for a safe retry', async () => {
    await enqueueOfflineAction('check_in', { sequence: 1 }, 'key-1')
    await enqueueOfflineAction('game_transaction', { sequence: 2 }, 'key-2')

    const result = await flushOfflineActions(async () => {
      throw new Error('network unavailable')
    })
    const queued = await listOfflineActions()

    expect(result).toEqual({ processed: 0, remaining: 2 })
    expect(queued[0]).toMatchObject({ attempts: 1, lastError: 'network unavailable' })
    expect(queued[1]).toMatchObject({ attempts: 0 })
  })

  it('caches the active event separately from queued mutations', async () => {
    await cacheActiveEvent('game-1', {
      phase: 'in_progress',
      participants: [{ id: 'participant-1', checkedIn: true }],
    })

    expect(await getCachedActiveEvent()).toMatchObject({
      gameId: 'game-1',
      data: {
        phase: 'in_progress',
        participants: [{ id: 'participant-1', checkedIn: true }],
      },
    })
    expect(await listOfflineActions()).toEqual([])
  })
})
