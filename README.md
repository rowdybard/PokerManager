# Poker Manager

Responsive PWA for running home poker games and privately tracking a professional poker career.

## Product boundaries

- Home games are the default workspace.
- `My Poker` is private to the signed-in owner.
- Guest RSVP works through `/i/:token` without an account.
- Money records are bookkeeping only. The application does not hold funds, collect buy-ins, pool prizes, process payments, or initiate transfers.
- Email is disabled until a client-owned sender domain is verified with Resend.
- Plaid is optional, read-only, and Sandbox-only by default. Imported transactions are reconciliation candidates and never post ledger entries automatically.

## Requirements

- Node.js 22.22–25
- Docker Desktop
- Supabase CLI 2.109+
- Wrangler 4

## Local setup

```powershell
Copy-Item .env.example .env
npm ci
npx supabase start
npx supabase db reset
npm run dev
```

Fill `.env` with the local Supabase URL and publishable/anon key printed by `supabase status`. Never place a service-role key, Resend key, Plaid secret, or encryption key in a `VITE_` variable.

Edge Function secrets are documented in `supabase/functions/.env.example`. Keep both integration flags false unless their complete server-side configuration exists.

## Verification

```powershell
npm run lint
npm run test
npm run build
npm audit --omit=dev
npx supabase db reset
npx supabase test db
npx supabase db lint --level warning --fail-on warning
npm run test:e2e
```

GitHub Actions runs the application, database, and responsive browser gates independently.

## Database workflow

Production is the Supabase project `aflrgcrerzggnkhwenrr`. Migrations are additive and data-preserving.

- Never run `supabase db reset --linked` against production.
- Never use production data as local seed data.
- Review migrations and pass a clean local reset before applying them remotely.
- Generate types after every schema change:

  ```powershell
  npx supabase gen types typescript --local > src/types/database.ts
  ```

- Finalized games and ledger entries are immutable. Corrections use reversal or adjustment records.

## Deployment

Cloudflare Pages is connected to Git. A successful push triggers the configured build and deployment for `poker-manager.pages.dev`. Do not use a manual direct upload for this Git-integrated project.

Production browser variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_APP_URL
VITE_EMAIL_ENABLED=false
VITE_PLAID_ENABLED=false
```

See [Operations](docs/OPERATIONS.md) for integration activation and recovery procedures.
