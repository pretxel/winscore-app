## 1. Branding resolver

- [x] 1.1 In `lib/competition.ts`, add a `PRODUCT_NAME = "Winscore"` constant and return it from `getActiveBranding().siteName` unconditionally (drop the `"${shortName} Pool"` interpolation).
- [x] 1.2 `lib/competition.ts`: `emailFromName` stays competition-scoped (descoped — see §8.4); `FALLBACK_EMAIL_FROM_NAME` remains "World Cup Pools". `ogAlt` fallback → `${shortName} · Winscore`; `newsQuery`, `brandCode`, `shortName` competition-derived.
- [x] 1.3 Audit every `getActiveBranding()` caller — confirmed no caller consumed `siteName` (zero consumers); `emailFromName` consumers pass the sender name through.

## 2. App metadata

- [x] 2.1 `app/layout.tsx`: `siteName` → "Winscore"; `defaultTitle` → edition form "Winscore — World Cup 2026: Daily Predictions & Live Leaderboard"; added "Winscore" to `keywords`. (`applicationName`/`authors`/`creator`/`publisher`/JSON-LD names all reference the const.)
- [x] 2.2 `app/layout.tsx`: title `template` → "%s · Winscore"; JSON-LD `WebSite.name`/`Organization.name` (via const) → "Winscore".
- [x] 2.3 `app/[locale]/layout.tsx`: OG `siteName` → "Winscore"; title `template` → "%s · Winscore".

## 3. UI copy (i18n)

- [x] 3.1 `messages/en.json`: product-brand "World Cup 2026 Pool"/"WC26 Pool"/"World Cup pool" → "Winscore"; titles keep "World Cup 2026" edition subtitle; `footer.tournament` kept as tournament edition.
- [x] 3.2 `messages/{es,fr,de}.json`: same split, incl. localized brand forms ("Quiniela/Pool Mundial 2026", "Pool Coupe du Monde 2026", German "World Cup Pool"/"WC26 Pool") → "Winscore" with localized editions.
- [x] 3.3 Grepped all `messages/*.json`: zero residual product-brand literals; all 4 files valid JSON.

## 4. Package metadata

- [x] 4.1 `package.json` `"name"` `world-cup-pools` → `winscore`.

## 5. Documentation

- [x] 5.1 `README.md`: heading + intro → Winscore (kept FIFA World Cup 2026 context); example domain → `winscore.example.com`.
- [x] 5.2 `docs/architecture.md`, `docs/operator-guide.md` (incl. EMAIL_FROM sender examples), `docs/test-plan.md` → Winscore. Kept real `world-cup-pool-sepia.vercel.app` infra URLs.
- [x] 5.3 `public/flags/README.md` → Winscore.

## 6. Tests

- [x] 6.1 Email-sender assertions across 18 test files: `World Cup Pools` → `Winscore` (addresses untouched).
- [x] 6.2 `tests/news.test.ts` + `tests/sync-matches-email.test.ts` branding mocks: `siteName` → "Winscore", `ogAlt` → "World Cup 2026 · Winscore".

## 7. Verification

- [x] 7.1 `pnpm typecheck` clean, `pnpm lint` 0 errors (1 pre-existing warning), `pnpm test` 1117/1117 pass.
- [x] 7.2 `pnpm build` compiles + TypeScript passes; page-data collection fails only on missing `NEXT_PUBLIC_SUPABASE_URL` (no `.env.local` on this checkout — env-gated, not a rename regression).
- [x] 7.3 Zero residual `World Cup 2026 Pool`/`WC26 Pool`/`World Cup Pool` in `app/`, `components/`, `lib/`, `messages/`. Deferred visual glyph (`Logotype` "· Pool", OG-route `{brandCode} POOL`, `brandCode`="WC26") intentionally remains.

## 8. Discovered product literals (not in original scope)

- [x] 8.1 `lib/env.ts`: `EMAIL_FROM` default left as `"World Cup Pools <onboarding@resend.dev>"` (email sender descoped — §8.4).
- [x] 8.2 `lib/ai/openrouter.ts`: `X-Title` attribution `"World Cup Pools"` → `"Winscore"` (app identifier, not email sender).
- [x] 8.3 Additional in-scope app literals found in 7.3 sweep: page title suffixes `· WC26 Pool` (`how-it-works`, `matches/[matchId]` ×2) → `· Winscore`; logo accessible names (`site-nav` aria-label → `branding.siteName`, landing `Logotype ariaLabel`) → "Winscore"; `app/opengraph-image.alt.txt` → "Winscore …".
- [x] 8.4 **DECIDED — descope email sender (option B).** Per-competition `branding.emailFromName` overrides stay ("World Cup Pools" / "La Liga Pools" / "Liga MX Pools"); no seed/migration edits. Reverted the `emailFromName` fallback in `lib/competition.ts`, the `EMAIL_FROM` default in `lib/env.ts`, the operator-guide sender examples, and the email-sender test assertions. Spec/proposal/design updated to reflect competition-scoped sender.
