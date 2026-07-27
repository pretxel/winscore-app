## Why

The app's email sender address currently uses `edselserrano.com` (a personal domain) for transactional emails. With the product branding moving to `winscore.me`, all outbound emails should come from `no-reply@winscore.me` to present a consistent brand identity.

## What Changes

- Update `EMAIL_FROM` env var default in `lib/env.ts` from `"Winscore <onboarding@resend.dev>"` to `"Winscore <no-reply@winscore.me>"`
- Update `EMAIL_REPLY_TO` fallback derivation to match the new domain
- Update `supabase/config.toml` SMTP `admin_email` from `no-reply@edselserrano.com` to `no-reply@winscore.me`
- Update `.env.local` values and Vercel environment variables (deployment concern)
- Update any remaining references to the old sender domain in email code

## Capabilities

### New Capabilities
*(none — this is a configuration update, not a new capability)*

### Modified Capabilities
*(none — the existing email capabilities have the same requirements; only the domain value changes)*

## Impact

- `lib/env.ts` — default `emailFrom` and `emailReplyTo` constants
- `supabase/config.toml` — SMTP `admin_email` for GoTrue auth emails
- Resend must have `winscore.me` domain verified (infrastructure)
- Vercel environment variables for production/preview deployments
