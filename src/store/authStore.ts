import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { env } from '../lib/env'
import { queryClient } from '../lib/queryClient'
import {
  clearLegacyUnscopedOfflineState,
  clearOfflineStateForUser,
  setOfflineStorageUser,
} from '../lib/offlineQueue'

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

let scopedUserId: string | null = null
let authListenerRegistered = false

async function transitionClientScope(nextUserId: string | null) {
  const previousUserId = scopedUserId
  if (previousUserId === nextUserId) {
    setOfflineStorageUser(nextUserId)
    await clearLegacyUnscopedOfflineState()
    return
  }

  if (previousUserId) {
    try {
      await clearOfflineStateForUser(previousUserId)
    } catch {
      // Switching the scoped key still prevents the next account from reading
      // prior data if IndexedDB cleanup is temporarily unavailable.
    }
  }
  queryClient.clear()
  scopedUserId = nextUserId
  setOfflineStorageUser(nextUserId)
  try {
    await clearLegacyUnscopedOfflineState()
  } catch {
    // Legacy keys are never read by the scoped queue implementation.
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    await transitionClientScope(session?.user.id ?? null)
    set({ user: session?.user ?? null, initialized: true })

    if (!authListenerRegistered) {
      authListenerRegistered = true
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        const nextUser = nextSession?.user ?? null
        void transitionClientScope(nextUser?.id ?? null)
          .then(() => set({ user: nextUser }))
          .catch(() => {
            queryClient.clear()
            scopedUserId = nextUser?.id ?? null
            setOfflineStorageUser(scopedUserId)
            set({ user: nextUser })
          })
      })
    }
  },

  signIn: async (email, password) => {
    set({ loading: true })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ loading: false })
    if (error) {
      const msg = typeof error.message === 'string' ? error.message : JSON.stringify(error)
      return { error: msg }
    }
    return { error: null }
  },

  signInWithMagicLink: async (email) => {
    set({ loading: true })
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: env.appUrl },
    })
    set({ loading: false })
    return { error: error?.message ?? null }
  },

  signUp: async (email, password) => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signUp({ email, password })
    set({ loading: false })
    if (error) {
      const msg = typeof error.message === 'string' ? error.message : JSON.stringify(error)
      return { error: msg }
    }
    if (data?.user && !data.session) {
      return { error: 'Check your email for a confirmation link to complete signup.' }
    }
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    await transitionClientScope(null)
    set({ user: null })
  },
}))
