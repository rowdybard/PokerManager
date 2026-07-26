import { z } from 'zod'

const booleanFlag = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => value === 'true')

const browserEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  VITE_APP_URL: z.string().url().optional(),
  VITE_EMAIL_ENABLED: booleanFlag,
  VITE_PLAID_ENABLED: booleanFlag,
})

const parsed = browserEnvSchema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(`Invalid public environment configuration: ${parsed.error.message}`)
}

const isProduction = import.meta.env.PROD
const missingSupabaseConfig =
  !parsed.data.VITE_SUPABASE_URL || !parsed.data.VITE_SUPABASE_ANON_KEY

if (isProduction && missingSupabaseConfig) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for a production build.',
  )
}

export const env = Object.freeze({
  supabaseUrl: parsed.data.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
  supabaseAnonKey: parsed.data.VITE_SUPABASE_ANON_KEY ?? 'local-anon-key-not-configured',
  appUrl:
    parsed.data.VITE_APP_URL ??
    (typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin),
  emailEnabled: parsed.data.VITE_EMAIL_ENABLED,
  plaidEnabled: parsed.data.VITE_PLAID_ENABLED,
  isProduction,
})
