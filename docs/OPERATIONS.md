# Poker Manager Operations

## Release gate

1. Confirm `git status` contains only intended changes.
2. Run the application, database, and browser verification commands from the README.
3. Back up production and record row counts for leagues, memberships, seasons, players, games, results, and invites.
4. Preview pending database migrations.
5. Apply the reviewed additive migration.
6. Run Supabase security and performance advisors.
7. Deploy Edge Functions with their checked-in `verify_jwt` configuration.
8. Smoke-test owner, admin, member, guest invitation, and private-career boundaries.
9. Commit and push. Confirm GitHub CI and Cloudflare deployment health.

Never reset the linked production database.

## Resend activation

Email stays disabled until the client owns a domain and its DNS records are verified in Resend.

Required server secrets:

```text
EMAIL_ENABLED=true
EMAIL_PROCESSOR_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_WEBHOOK_SECRET
```

Required steps:

1. Verify the client-owned domain in Resend.
2. Use a sender such as `Poker Manager <noreply@client-domain.example>`.
3. Configure Supabase Auth SMTP with the same verified Resend domain.
4. Configure the signed Resend webhook endpoint:
   `https://aflrgcrerzggnkhwenrr.supabase.co/functions/v1/resend-webhook`
5. Enable email for the owner in application email settings.
6. Send to internal test recipients and verify delivered, bounced, complained, duplicate, and out-of-order webhook behavior.
7. Set `VITE_EMAIL_ENABLED=true` only after the server checks pass.

`poker-manager.pages.dev` is an application host, not a sender domain.

## Plaid Sandbox activation

Required server secrets:

```text
PLAID_ENABLED=true
PLAID_ENVIRONMENT=sandbox
PLAID_PRODUCTION_APPROVED=false
PLAID_CLIENT_ID
PLAID_SECRET
PLAID_WEBHOOK_URL
PLAID_TOKEN_ENCRYPTION_KEY
```

`PLAID_TOKEN_ENCRYPTION_KEY` is a base64url-encoded 32-byte random key. Back it up in the approved secret manager; losing it makes existing Plaid access tokens unreadable.

The integration permits only Link, Item removal, webhook verification keys, and Transactions Sync. It must not be expanded to Transfer, Payment Initiation, Auth-based payments, ACH, or another money-movement product.

Before production Plaid:

1. Pass Sandbox added/modified/removed/pending and duplicate-webhook tests.
2. Confirm candidates cannot mutate bankroll ledgers automatically.
3. Obtain the client’s explicit approval and Plaid production access.
4. Set `PLAID_ENVIRONMENT=production` and `PLAID_PRODUCTION_APPROVED=true`.
5. Set `VITE_PLAID_ENABLED=true` only after server activation.

## Recovery

- Database: restore from the production backup, then reconcile migration history. Never repair history blindly.
- Frontend: use the prior successful Cloudflare/Git deployment.
- Edge Functions: redeploy the prior Git revision.
- Plaid: disconnect the affected Item; this removes provider access and clears the stored encrypted token.
- Email: set `EMAIL_ENABLED=false`; invitation copy/share links continue to work.
