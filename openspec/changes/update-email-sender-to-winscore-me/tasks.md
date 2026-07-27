## 1. Update code defaults

- [x] 1.1 Update `emailFrom` default in `lib/env.ts` from `"Winscore <onboarding@resend.dev>"` to `"Winscore <no-reply@winscore.me>"`
- [x] 1.2 Update `emailReplyTo` fallback in `lib/env.ts` to use the new default domain

## 2. Update Supabase config

- [x] 2.1 Update `supabase/config.toml` SMTP `admin_email` from `no-reply@edselserrano.com` to `no-reply@winscore.me`

## 3. Deploy configuration

- [ ] 3.1 Update `.env.local` with the new `EMAIL_FROM` and `EMAIL_REPLY_TO` values
- [ ] 3.2 Update Vercel environment variables for production/preview deployments
- [ ] 3.3 Verify `winscore.me` is verified in Resend dashboard
