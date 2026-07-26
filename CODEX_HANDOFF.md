# Poker Manager Professional Suite — Handoff

Last updated: 2026-07-26 (America/New_York)

## Release state

- Repository: `C:\PokerManager`
- Branch: `codex/professional-suite`
- Production Supabase: `aflrgcrerzggnkhwenrr`
- Cloudflare Pages project: `poker-manager`
- Production URL: `https://poker-manager.pages.dev`
- Docker is intentionally off. Do not restart it unless the user asks.
- Email and Plaid are intentionally disabled pending their launch prerequisites.

The full home-game and private My Poker interfaces are implemented. Production
Supabase is current, all Edge Functions are deployed from the current source,
and every available non-Docker local gate is green. GitHub's database job is
the remaining clean-reset/pgTAP authority.

## Production Supabase

- Sixteen local migrations exactly match the sixteen remote migrations.
- The nine historical production migrations are the canonical local baseline.
- Existing data was preserved: 1 league, 7 games, 8 invitations, and 40 results.
- Ten contacts and eight participants were conservatively backfilled.
- RLS boundaries were live-tested in rollback-only transactions for owner,
  admin, member, unrelated user, anonymous caller, guest token, and private
  career data.
- Anonymous callers have no direct table grants or public helper execution.
- Realtime includes the ten active-event tables.
- `career-documents` is a private Storage bucket.
- Remote `supabase db lint --level warning --fail-on warning` is clean.
- Supabase security and performance advisors have no warning/error findings.
- Five current Edge Functions are active:
  - `guest-invite`
  - `process-email-queue`
  - `resend-webhook`
  - `plaid`
  - `plaid-webhook`
- Smoke checks:
  - guessed guest token: 404 with no event disclosure
  - email processor: 200 and explicitly disabled
  - unauthenticated Plaid endpoint: 401

## Product delivered

- Responsive owner/admin/member home-game dashboards.
- Contact book, conservative duplicate merging, invite groups, recurring
  cash/tournament templates, and versioned scoring.
- Account-free hashed-token RSVP route at `/i/:token`.
- Waitlists, guest counts, check-in, multi-table seating, blind/break clock,
  eliminations, bounties, results, and role-aware controls.
- Append-only game transactions, cash reconciliation, variance warnings,
  server-side atomic finalization, and auditable corrections.
- IndexedDB active-event cache and offline check-in/transaction replay with
  UUID idempotency keys. Finalization remains online-only.
- Private career sessions, bankroll accounts/ledger/reversals, settlements,
  receipts, trips/expenses, staking/makeup/splits, calendar/exposure, hand
  imports/review, opponents, study, goals, analytics, and CSV/print-to-PDF.
- One-way private link from a finalized home result into My Poker.
- Feature-gated read-only Plaid reconciliation candidates; no money movement.
- Resend queue, retry/idempotency handling, and signed webhook processing.

## Safety invariants

- Poker Manager records and reconciles money but never stores funds, pools
  prize money, collects buy-ins, pays players, or initiates transfers.
- Money is integer minor units plus ISO currency.
- Finalized games and ledger entries are immutable; corrections are
  reversals/adjustments.
- Private career, receipt, staking, hand, and financial data is owner-only.
- `poker-manager.pages.dev` hosts the app and invite links but cannot be a
  Resend sender. Real email waits for a client-owned DNS-verified domain.
- Plaid stays Sandbox-first and read-only; Transfer, ACH, Payment Initiation,
  and all other movement products are excluded.

## Local verification completed

- `npm run lint`
- `npm test` — 25/25
- Deno frozen typecheck — all five Edge entry points
- `npm run build`
- `npm audit --omit=dev` — zero vulnerabilities
- Playwright desktop/mobile — 4/4
- visual browser pass for guest and sign-in screens
- `git diff --check`
- remote migration parity and remote DB lint

## CI and publishing

CI runs three jobs:

1. application: install, lint, Vitest, frozen Deno checks, build, production audit
2. database: Supabase start/reset, pgTAP, warning-failing lint, generated-type parity
3. browser: desktop/mobile Chromium Playwright

Before calling the release complete:

1. Commit and push `codex/professional-suite`.
2. Open a draft PR.
3. Fix any GitHub CI failure, especially the Docker-backed database job.
4. Merge only when all checks pass.
5. Verify the Git-connected Cloudflare production deployment and smoke-test
   `https://poker-manager.pages.dev`.
