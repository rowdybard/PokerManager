import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { env } from './env'

export const supabase = createClient(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

// Legacy screens still narrow older table shapes locally. New data-access
// modules use this generated-schema view of the same singleton client.
export const typedSupabase = supabase as SupabaseClient<Database>
