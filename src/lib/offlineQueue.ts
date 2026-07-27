import { del, get, set } from 'idb-keyval'
import { AppError, errorMessage } from './errors'

export type OfflineActionKind = 'check_in' | 'game_transaction'

export interface OfflineAction {
  id: string
  userId: string
  idempotencyKey: string
  kind: OfflineActionKind
  payload: Record<string, unknown>
  createdAt: string
  attempts: number
  lastError?: string
}

export interface CachedActiveEvent<T = Record<string, unknown>> {
  userId: string
  gameId: string
  cachedAt: string
  data: T
}

const LEGACY_QUEUE_KEY = 'poker-manager:offline-actions:v1'
const LEGACY_ACTIVE_EVENT_KEY = 'poker-manager:active-event:v1'
const QUEUE_KEY_PREFIX = 'poker-manager:offline-actions:v2'
const QUEUE_GAMES_KEY_PREFIX = 'poker-manager:offline-action-games:v2'
const ACTIVE_EVENT_KEY_PREFIX = 'poker-manager:active-event:v2'
const ACTIVE_EVENT_GAMES_KEY_PREFIX = 'poker-manager:active-event-games:v2'
const LAST_ACTIVE_EVENT_KEY_PREFIX = 'poker-manager:last-active-event:v2'

let activeUserId: string | null = null
const memoryQueues = new Map<string, OfflineAction[]>()
const memoryQueueGames = new Map<string, Set<string>>()
const memoryActiveEvents = new Map<string, CachedActiveEvent>()
const memoryActiveGames = new Map<string, Set<string>>()
const memoryLastActiveGame = new Map<string, string>()

function canUseIndexedDb() {
  return typeof indexedDB !== 'undefined'
}

function requireUserScope() {
  if (!activeUserId) {
    throw new AppError(
      'Sign in before using offline game activity.',
      'AUTH_REQUIRED',
    )
  }
  return activeUserId
}

function safeKeyPart(value: string) {
  return encodeURIComponent(value)
}

function queueKey(userId: string, gameId: string) {
  return `${QUEUE_KEY_PREFIX}:${safeKeyPart(userId)}:${safeKeyPart(gameId)}`
}

function queueGamesKey(userId: string) {
  return `${QUEUE_GAMES_KEY_PREFIX}:${safeKeyPart(userId)}`
}

function activeEventKey(userId: string, gameId: string) {
  return `${ACTIVE_EVENT_KEY_PREFIX}:${safeKeyPart(userId)}:${safeKeyPart(gameId)}`
}

function activeEventGamesKey(userId: string) {
  return `${ACTIVE_EVENT_GAMES_KEY_PREFIX}:${safeKeyPart(userId)}`
}

function lastActiveEventKey(userId: string) {
  return `${LAST_ACTIVE_EVENT_KEY_PREFIX}:${safeKeyPart(userId)}`
}

export function setOfflineStorageUser(userId: string | null) {
  activeUserId = userId
}

export async function clearLegacyUnscopedOfflineState() {
  if (!canUseIndexedDb()) return
  await Promise.all([
    del(LEGACY_QUEUE_KEY),
    del(LEGACY_ACTIVE_EVENT_KEY),
  ])
}

async function readStoredQueue(userId: string): Promise<OfflineAction[]> {
  const gameIds = canUseIndexedDb()
    ? (await get<string[]>(queueGamesKey(userId))) ?? []
    : [...(memoryQueueGames.get(userId) ?? [])]
  const queues = canUseIndexedDb()
    ? await Promise.all(
        gameIds.map((gameId) => get<OfflineAction[]>(queueKey(userId, gameId))),
      )
    : gameIds.map((gameId) => memoryQueues.get(queueKey(userId, gameId)))
  return queues
    .flatMap((queue) => queue ?? [])
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}

async function writeStoredQueue(userId: string, queue: OfflineAction[]) {
  const grouped = new Map<string, OfflineAction[]>()
  for (const action of queue) {
    const gameId = action.payload.gameId
    if (typeof gameId !== 'string' || !gameId) {
      throw new AppError('Queued game activity is missing its game scope.', 'VALIDATION')
    }
    grouped.set(gameId, [...(grouped.get(gameId) ?? []), action])
  }

  if (!canUseIndexedDb()) {
    const previousGames = memoryQueueGames.get(userId) ?? new Set<string>()
    for (const gameId of new Set([...previousGames, ...grouped.keys()])) {
      const gameQueue = grouped.get(gameId)
      const key = queueKey(userId, gameId)
      if (gameQueue?.length) memoryQueues.set(key, gameQueue)
      else memoryQueues.delete(key)
    }
    memoryQueueGames.set(userId, new Set(grouped.keys()))
    return
  }

  const registryKey = queueGamesKey(userId)
  const previousGames = new Set((await get<string[]>(registryKey)) ?? [])
  await Promise.all([
    set(registryKey, [...grouped.keys()]),
    ...[...new Set([...previousGames, ...grouped.keys()])].map((gameId) => {
      const gameQueue = grouped.get(gameId)
      return gameQueue?.length
        ? set(queueKey(userId, gameId), gameQueue)
        : del(queueKey(userId, gameId))
    }),
  ])
}

export async function listOfflineActions() {
  const userId = requireUserScope()
  return readStoredQueue(userId)
}

export async function enqueueOfflineAction(
  kind: OfflineActionKind,
  payload: Record<string, unknown>,
  idempotencyKey: string = crypto.randomUUID(),
): Promise<OfflineAction> {
  const userId = requireUserScope()
  const gameId = payload.gameId
  if (typeof gameId !== 'string' || !gameId) {
    throw new AppError('Queued game activity requires a game.', 'VALIDATION')
  }
  const queue = await readStoredQueue(userId)
  const existing = queue.find((entry) => entry.idempotencyKey === idempotencyKey)
  if (existing) return existing

  const action: OfflineAction = {
    id: crypto.randomUUID(),
    userId,
    idempotencyKey,
    kind,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  await writeStoredQueue(userId, [...queue, action])
  return action
}

export async function removeOfflineAction(id: string) {
  const userId = requireUserScope()
  const queue = await readStoredQueue(userId)
  await writeStoredQueue(userId, queue.filter((entry) => entry.id !== id))
}

export async function flushOfflineActions(
  process: (action: OfflineAction) => Promise<void>,
): Promise<{ processed: number; remaining: number }> {
  const userId = requireUserScope()
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new AppError('Reconnect before syncing queued game activity.', 'OFFLINE')
  }

  const queue = await readStoredQueue(userId)
  const remaining: OfflineAction[] = []
  let processed = 0

  for (let index = 0; index < queue.length; index += 1) {
    const action = queue[index]
    try {
      await process(action)
      processed += 1
    } catch (error) {
      remaining.push({
        ...action,
        attempts: action.attempts + 1,
        lastError: errorMessage(error),
      })
      remaining.push(...queue.slice(index + 1))
      break
    }
  }

  await writeStoredQueue(userId, remaining)
  return { processed, remaining: remaining.length }
}

export async function cacheActiveEvent<T>(
  gameId: string,
  data: T,
): Promise<CachedActiveEvent<T>> {
  const userId = requireUserScope()
  if (!gameId) throw new AppError('A game is required before caching an event.', 'VALIDATION')
  const cached: CachedActiveEvent<T> = {
    userId,
    gameId,
    cachedAt: new Date().toISOString(),
    data,
  }
  const key = activeEventKey(userId, gameId)

  if (!canUseIndexedDb()) {
    memoryActiveEvents.set(key, cached as CachedActiveEvent)
    const games = memoryActiveGames.get(userId) ?? new Set<string>()
    games.add(gameId)
    memoryActiveGames.set(userId, games)
    memoryLastActiveGame.set(userId, gameId)
  } else {
    const registryKey = activeEventGamesKey(userId)
    const games = new Set((await get<string[]>(registryKey)) ?? [])
    games.add(gameId)
    await Promise.all([
      set(key, cached),
      set(registryKey, [...games]),
      set(lastActiveEventKey(userId), gameId),
    ])
  }
  return cached
}

export async function getCachedActiveEvent<T>(
  gameId?: string,
): Promise<CachedActiveEvent<T> | null> {
  const userId = requireUserScope()
  let requestedGameId = gameId
  if (!requestedGameId) {
    requestedGameId = canUseIndexedDb()
      ? await get<string>(lastActiveEventKey(userId))
      : memoryLastActiveGame.get(userId)
  }
  if (!requestedGameId) return null

  const key = activeEventKey(userId, requestedGameId)
  if (!canUseIndexedDb()) {
    return (memoryActiveEvents.get(key) as CachedActiveEvent<T> | undefined) ?? null
  }
  return (await get<CachedActiveEvent<T>>(key)) ?? null
}

export async function clearCachedActiveEvent(gameId?: string): Promise<void> {
  const userId = requireUserScope()
  const requestedGameId = gameId
    ?? (
      canUseIndexedDb()
        ? await get<string>(lastActiveEventKey(userId))
        : memoryLastActiveGame.get(userId)
    )
  if (!requestedGameId) return

  const key = activeEventKey(userId, requestedGameId)
  if (!canUseIndexedDb()) {
    memoryActiveEvents.delete(key)
    memoryActiveGames.get(userId)?.delete(requestedGameId)
    if (memoryLastActiveGame.get(userId) === requestedGameId) {
      memoryLastActiveGame.delete(userId)
    }
    return
  }

  const registryKey = activeEventGamesKey(userId)
  const games = new Set((await get<string[]>(registryKey)) ?? [])
  games.delete(requestedGameId)
  await Promise.all([
    del(key),
    set(registryKey, [...games]),
    del(lastActiveEventKey(userId)),
  ])
}

export async function clearOfflineStateForUser(userId: string): Promise<void> {
  const queueRegistryKey = queueGamesKey(userId)
  const registryKey = activeEventGamesKey(userId)

  if (!canUseIndexedDb()) {
    for (const gameId of memoryQueueGames.get(userId) ?? []) {
      memoryQueues.delete(queueKey(userId, gameId))
    }
    memoryQueueGames.delete(userId)
    for (const gameId of memoryActiveGames.get(userId) ?? []) {
      memoryActiveEvents.delete(activeEventKey(userId, gameId))
    }
    memoryActiveGames.delete(userId)
    memoryLastActiveGame.delete(userId)
    return
  }

  const queueGames = (await get<string[]>(queueRegistryKey)) ?? []
  const games = (await get<string[]>(registryKey)) ?? []
  await Promise.all([
    del(queueRegistryKey),
    del(registryKey),
    del(lastActiveEventKey(userId)),
    ...queueGames.map((gameId) => del(queueKey(userId, gameId))),
    ...games.map((gameId) => del(activeEventKey(userId, gameId))),
  ])
}

export async function clearOfflineActionsForTests() {
  memoryQueues.clear()
  memoryQueueGames.clear()
  memoryActiveEvents.clear()
  memoryActiveGames.clear()
  memoryLastActiveGame.clear()
  if (!canUseIndexedDb() || !activeUserId) return
  await clearOfflineStateForUser(activeUserId)
}
