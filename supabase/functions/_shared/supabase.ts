import {
  createClient,
  type SupabaseClient,
  type User,
} from 'npm:@supabase/supabase-js@2.110.8'
import { requiredEnv } from './env.ts'
import { HttpError } from './http.ts'

export function createAdminClient(): SupabaseClient {
  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function createUserClient(request: Request): SupabaseClient {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authentication required.')
  }

  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function requireUser(request: Request): Promise<{
  client: SupabaseClient
  user: User
}> {
  const client = createUserClient(request)
  const {
    data: { user },
    error,
  } = await client.auth.getUser()

  if (error || !user || user.is_anonymous) {
    throw new HttpError(401, 'A signed-in account is required.')
  }

  return { client, user }
}
