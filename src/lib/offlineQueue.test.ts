import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cacheActiveEvent,
  clearCachedActiveEvent,
  clearOfflineActionsForTests,
  clearOfflineStateForUser,
  enqueueOfflineAction,
  flushOfflineActions,
  getCachedActiveEvent,
  listOfflineActions,
  setOfflineStorageUser,
} from './offlineQueue'

describe('offline host action queue', () => {
  beforeEach(async () => {
    vi.stubGlobal('indexedDB', undefined)
    setOfflineStorageUser('user-1')
    await clearOfflineActionsForTests()
    await clearCachedActiveEvent()
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true)
  })

  it('deduplicates actions using the caller idempotency key', async () => {
    const first = await enqueueOfflineAction(
      'check_in',
      { gameId: 'game-1', playerId: 'player-1' },
      'same-key',
    )
    const duplicate = await enqueueOfflineAction(
      'check_in',
      { gameId: 'game-1', playerId: 'player-1' },
      'same-key',
    )

    expect(duplicate.id).toBe(first.id)
    expect(duplicate.userId).toBe('user-1')
    expect(await listOfflineActions()).toHaveLength(1)
  })

  it('replays in order and removes successful entries', async () => {
    await enqueueOfflineAction('check_in', { gameId: 'game-1', sequence: 1 }, 'key-1')
    await enqueueOfflineAction(
      'game_transaction',
      { gameId: 'game-1', sequence: 2 },
      'key-2',
    )
    const seen: number[] = []

    const result = await flushOfflineActions(async (action) => {
      seen.push(action.payload.sequence as number)
    })

    expect(seen).toEqual([1, 2])
    expect(result).toEqual({ processed: 2, remaining: 0 })
    expect(await listOfflineActions()).toEqual([])
  })

  it('isolates queued actions between authenticated users', async () => {
    await enqueueOfflineAction('check_in', { gameId: 'game-1' }, 'user-1-action')

    setOfflineStorageUser('user-2')
    expect(await listOfflineActions()).toEqual([])
    await enqueueOfflineAction('check_in', { gameId: 'game-2' }, 'user-2-action')

    setOfflineStorageUser('user-1')
    expect((await listOfflineActions()).map((action) => action.idempotencyKey)).toEqual([
      'user-1-action',
    ])
  })

  it('isolates active-event caches by both user and game', async () => {
    await cacheActiveEvent('game-1', { marker: 'user-1/game-1' })
    await cacheActiveEvent('game-2', { marker: 'user-1/game-2' })

    expect(await getCachedActiveEvent('game-1')).toMatchObject({
      userId: 'user-1',
      gameId: 'game-1',
      data: { marker: 'user-1/game-1' },
    })
    expect(await getCachedActiveEvent('game-2')).toMatchObject({
      userId: 'user-1',
      gameId: 'game-2',
      data: { marker: 'user-1/game-2' },
    })

    setOfflineStorageUser('user-2')
    expect(await getCachedActiveEvent('game-1')).toBeNull()
  })

  it('clears every queue and active-event key for a signed-out user', async () => {
    await enqueueOfflineAction('check_in', { gameId: 'game-1' }, 'queued')
    await cacheActiveEvent('game-1', { marker: 1 })
    await cacheActiveEvent('game-2', { marker: 2 })

    await clearOfflineStateForUser('user-1')

    expect(await listOfflineActions()).toEqual([])
    expect(await getCachedActiveEvent('game-1')).toBeNull()
    expect(await getCachedActiveEvent('game-2')).toBeNull()
  })

  it('retains a failed action and all later entries for a safe retry', async () => {
    await enqueueOfflineAction('check_in', { gameId: 'game-1', sequence: 1 }, 'key-1')
    await enqueueOfflineAction(
      'game_transaction',
      { gameId: 'game-1', sequence: 2 },
      'key-2',
    )

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
