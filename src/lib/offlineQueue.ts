import { get, set } from 'idb-keyval'
import { AppError, errorMessage } from './errors'

export type OfflineActionKind = 'check_in' | 'game_transaction'

export interface OfflineAction {
  id: string
  idempotencyKey: string
  kind: OfflineActionKind
  payload: Record<string, unknown>
  createdAt: string
  attempts: number
  lastError?: string
}

const QUEUE_KEY = 'poker-manager:offline-actions:v1'
const ACTIVE_EVENT_KEY = 'poker-manager:active-event:v1'
let memoryQueue: OfflineAction[] = []
let memoryActiveEvent: CachedActiveEvent | null = null

export interface CachedActiveEvent<T = Record<string, unknown>> {
  gameId: string
  cachedAt: string
  data: T
}

function canUseIndexedDb() {
  return typeof indexedDB !== 'undefined'
}

async function readStoredQueue(): Promise<OfflineAction[]> {
  if (!canUseIndexedDb()) return [...memoryQueue]
  return (await get<OfflineAction[]>(QUEUE_KEY)) ?? []
}

async function writeStoredQueue(queue: OfflineAction[]) {
  if (!canUseIndexedDb()) {
    memoryQueue = [...queue]
    return
  }
  await set(QUEUE_KEY, queue)
}

export async function listOfflineActions() {
  return readStoredQueue()
}

export async function enqueueOfflineAction(
  kind: OfflineActionKind,
  payload: Record<string, unknown>,
  idempotencyKey: string = crypto.randomUUID(),
): Promise<OfflineAction> {
  const queue = await readStoredQueue()
  const existing = queue.find((entry) => entry.idempotencyKey === idempotencyKey)
  if (existing) return existing

  const action: OfflineAction = {
    id: crypto.randomUUID(),
    idempotencyKey,
    kind,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  await writeStoredQueue([...queue, action])
  return action
}

export async function removeOfflineAction(id: string) {
  const queue = await readStoredQueue()
  await writeStoredQueue(queue.filter((entry) => entry.id !== id))
}

export async function flushOfflineActions(
  process: (action: OfflineAction) => Promise<void>,
): Promise<{ processed: number; remaining: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new AppError('Reconnect before syncing queued game activity.', 'OFFLINE')
  }

  const queue = await readStoredQueue()
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

  await writeStoredQueue(remaining)
  return { processed, remaining: remaining.length }
}

export async function clearOfflineActionsForTests() {
  memoryQueue = []
  if (canUseIndexedDb()) await set(QUEUE_KEY, [])
}

export async function cacheActiveEvent<T>(
  gameId: string,
  data: T,
): Promise<CachedActiveEvent<T>> {
  if (!gameId) throw new AppError('A game is required before caching an event.', 'VALIDATION')
  const cached: CachedActiveEvent<T> = {
    gameId,
    cachedAt: new Date().toISOString(),
    data,
  }
  if (!canUseIndexedDb()) {
    memoryActiveEvent = cached as CachedActiveEvent
  } else {
    await set(ACTIVE_EVENT_KEY, cached)
  }
  return cached
}

export async function getCachedActiveEvent<T>(): Promise<CachedActiveEvent<T> | null> {
  if (!canUseIndexedDb()) return memoryActiveEvent as CachedActiveEvent<T> | null
  return (await get<CachedActiveEvent<T>>(ACTIVE_EVENT_KEY)) ?? null
}

export async function clearCachedActiveEvent(): Promise<void> {
  memoryActiveEvent = null
  if (canUseIndexedDb()) await set(ACTIVE_EVENT_KEY, null)
}
