import { describe, expect, it, vi } from 'vitest'

const authMocks = vi.hoisted(() => {
  let listener: ((event: string, session: unknown) => void) | undefined
  return {
    getSession: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
      listener = callback
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    }),
    emit(event: string, session: unknown) {
      listener?.(event, session)
    },
  }
})

const offlineMocks = vi.hoisted(() => ({
  clearLegacyUnscopedOfflineState: vi.fn().mockResolvedValue(undefined),
  clearOfflineStateForUser: vi.fn().mockResolvedValue(undefined),
  setOfflineStorageUser: vi.fn(),
}))

const queryClientMock = vi.hoisted(() => ({
  clear: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      signOut: authMocks.signOut,
      onAuthStateChange: authMocks.onAuthStateChange,
      signInWithPassword: vi.fn(),
      signInWithOtp: vi.fn(),
      signUp: vi.fn(),
    },
  },
}))

vi.mock('../lib/offlineQueue', () => offlineMocks)
vi.mock('../lib/queryClient', () => ({ queryClient: queryClientMock }))
vi.mock('../lib/env', () => ({ env: { appUrl: 'https://example.test' } }))

import { useAuthStore } from './authStore'

describe('auth client-data isolation', () => {
  it('clears the previous account cache on account change and sign-out', async () => {
    const firstUser = { id: '00000000-0000-4000-8000-000000000001' }
    const secondUser = { id: '00000000-0000-4000-8000-000000000002' }
    authMocks.getSession.mockResolvedValue({
      data: { session: { user: firstUser } },
    })
    authMocks.signOut.mockResolvedValue({ error: null })

    await useAuthStore.getState().initialize()
    expect(offlineMocks.setOfflineStorageUser).toHaveBeenLastCalledWith(firstUser.id)

    authMocks.emit('SIGNED_IN', { user: secondUser })
    await vi.waitFor(() => {
      expect(offlineMocks.clearOfflineStateForUser).toHaveBeenCalledWith(firstUser.id)
    })
    expect(queryClientMock.clear).toHaveBeenCalled()
    expect(offlineMocks.setOfflineStorageUser).toHaveBeenLastCalledWith(secondUser.id)

    await useAuthStore.getState().signOut()
    expect(offlineMocks.clearOfflineStateForUser).toHaveBeenCalledWith(secondUser.id)
    expect(offlineMocks.setOfflineStorageUser).toHaveBeenLastCalledWith(null)
    expect(useAuthStore.getState().user).toBeNull()
  })
})
