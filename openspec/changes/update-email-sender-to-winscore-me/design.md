## Context

All transactional emails (results, reminders, digests, magic links, group invites, etc.) are sent via Resend using `EMAIL_FROM` env var (defaulting to `"Winscore <onboarding@resend.dev>"` in dev) and `supabase/config.toml` SMTP `admin_email` for GoTrue auth emails (currently `"no-reply@edselserrano.com"`). The production `.env.local` and Vercel env vars override the default with the old domain. The project's domain is `winscore.me`.

## Goals / Non-Goals

**Goals:**
- Change the sender address from the old domain to `no-reply@winscore.me` across all email paths
- Update the dev fallback in `lib/env.ts` to match the new domain
- Update Supabase GoTrue SMTP `admin_email` in `supabase/config.toml`

**Non-Goals:**
- No changes to email templates, sending logic, or Resend integration patterns
- No Resend domain verification (done out of band in the Resend dashboard)
- No changes to `EMAIL_REPLY_TO` behavior — it derives from `EMAIL_FROM` automatically

## Decisions

1. **Update `lib/env.ts` default, not just `.env.local`** — The default `"Winscore <onboarding@resend.dev>"` is misleading for local dev where env vars are already set. Changing the default keeps things consistent even if `.env.local` is missing the `EMAIL_FROM` override.

2. **No code changes beyond defaults** — The `env.emailFrom` and `env.emailReplyTo` already read from `process.env.EMAIL_FROM`; updating the default is sufficient. No import or logic changes needed.

3. **Update `supabase/config.toml` in source** — The SMTP `admin_email` is checked into version control and must match the verified Resend domain for GoTrue auth emails to pass SPF/DKIM.

## Risks / Trade-offs

- **Resend domain verification required** — If `winscore.me` is not yet verified in Resend, emails will fail. This is an out-of-band infra step, not a code change. → Mitigation: verify domain in Resend dashboard before deploying.
- **SPF/DKIM/DMARC records** — The `winscore.me` DNS must have the required Resend TXT records. → Mitigation: coordinate with domain admin before deploy.
- **Supabase GoTrue SMTP** — The `admin_email` in `config.toml` is used by GoTrue for auth emails (magic link, password reset). If the domain is not yet verified in Resend, auth emails will bounce. → Mitigation: verify domain first.
