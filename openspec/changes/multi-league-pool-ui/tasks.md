# Depends on

`multi-league-pool-platform` (backend/resolver) must be applied first. This
change is app-breaking mid-migration — sequence resolver swap → routes →
cutover behind `pnpm typecheck`.

## 1. Design foundation (full-app rebrand — "matchday board")

- [x] 1.1 `globals.css`: made the existing `.dark` "Stadium night" theme the default and retuned its base surfaces from blue-ink (hue 250) → petrol-teal (hue ~205). Reused existing semantic tokens (`--flag` floodlight, `--primary` emerald, `--border` turf-line, `--foreground` chalk, `--live`) rather than adding duplicates. Per-league hue passed to `LeagueRail`.
- [x] 1.2 Fonts: display → **Archivo Black** (`--font-heading`); kept Manrope (body) + JetBrains Mono (data). `ThemeProvider` `defaultTheme="dark"`, dropped `enableSystem` so the pitch look is the default identity (toggle still offers light).
- [x] 1.3 `components/league-rail.tsx` — vertical league nameplate on the league hue.
- [x] 1.4 `components/scoreline.tsx` + `@keyframes flap` (reduced-motion gated) — split-flap flip on value change.

## 2. DB-layer league context + resolver swap

- [x] 2.1 Migration: redefine `active_competition_id()` to resolve the `x-league` request header (`current_setting('request.headers', true)::json ->> 'x-league'` → league id) with a single-active fallback. Scopes every existing competition-scoped view/RLS/function to the request league unchanged. **Needs live-DB smoke test (RLS).**
- [x] 2.2 `createServerSupabaseClient(leagueSlug?)`: inject `global.headers['x-league']` when a league is in context.
- [x] 2.3 Update the 8 cron routes to iterate `listLiveLeagues()` and dispatch per league (create a per-league client so the header scopes each run); add a per-league count to each cron summary log.
- [x] 2.4 Retarget page/UI + `lib` helper callers (`bracket.ts`, `group-table.ts`, `news-sync.ts`, pages) to resolve league from route/pool and pass the slug to the client; `pnpm typecheck` enumerates the sites. (Admin / auth-email / live-matches API intentionally stay on the active competition — out of the `[league]` page set.)

## 3. Routing — `[league]` segment

- [x] 3.1 Add the `[league]` route segment (inside `[locale]`); move `matches`, `matches/[matchId]`, `leaderboard`, `my-picks`, `standings`, `bracket` under `/[locale]/[league]/…`. (Auth for `my-picks` preserved via `[league]/(app)/layout.tsx`.)
- [x] 3.2 Resolve the league per route via `getLeagueFromContext({ slug })` (in `[league]/layout.tsx` + each page); unknown/non-live slug → redirect to the catalog.
- [x] 3.3 308-redirect legacy paths (`/matches`, `/leaderboard`, …) to the league catalog (`next.config.ts` `redirects()`, locale-constrained).
- [ ] 3.4 Per-league `generateMetadata`: canonical done (`/${league}/…`); **edition subtitle still pending**.

## 4. Screens

- [x] 4.1 Cross-league home: stacked `LeagueLane`s (rail + pool cards + live/next fixtures + "Start a pool"); empty state shows the catalog + primary create action. Data: `listMyPoolsByLeague()` + `getLeagueLaneFixtures()` (`lib/home.ts`). Also repointed the global nav (matches/standings/bracket/leaderboard/my-picks are league-scoped now → nav routes to `/catalog`). `home` + `nav.leagues` i18n keys added to all 4 locales. typecheck + lint + build green.
- [ ] 4.2 League catalog page: live leagues as startable options. Data: `listLiveLeagues()`.
- [ ] 4.3 Create-pool flow (coupon aesthetic): select live league → name → create (pass `p_competition_id`) → surface `join_code`.
- [ ] 4.4 Pool dashboard: single-league focus via `getLeagueForPool` — that league's fixtures, member predictions, pool standings.
- [ ] 4.5 Join-by-code entry point on the home and pool dashboard.

## 5. Cutover (cleanup migration)

- [ ] 5.1 `set_league_live()` to flip the launch leagues live.
- [ ] 5.2 After no caller depends on the old anchors: migration dropping `is_active`, `active_competition_id()`, `set_active_competition()`, and the `is_active` guard branch. Regenerate `lib/database.types.ts`.

## 6. Verification

- [ ] 6.1 `pnpm typecheck`, `pnpm lint`, `pnpm test` green.
- [ ] 6.2 `pnpm build` compiles + TypeScript passes.
- [ ] 6.3 Two-live-league smoke: create a pool in each; each pool's fixtures/standings league-isolated; legacy paths redirect; kickoff-lock intact.
- [ ] 6.4 A11y + responsive: lanes stack on mobile, keyboard focus visible, `prefers-reduced-motion` disables flip/slide.
