# Scope

This change delivers the **backend, data model, and resolver** for concurrent
leagues + league-scoped pools — additive and shippable at every step. Routes,
design system, and UI (former §4–§6, plus the disruptive §3.2 caller swap and
the §8 `is_active` drop) are split into the follow-up change
**`multi-league-pool-ui`**.

## 1. Schema — concurrent leagues (additive)

- [x] 1.1 Migration `20260722000000_concurrent_leagues.sql`: add `competitions.is_live` (backfilled from `is_active`).
- [x] 1.2 Drop the single-active partial unique index; keep `is_active` for the transition.
- [x] 1.3 Add `set_league_live(p_id uuid, p_live boolean)` (admin-only, raises on unknown id, sets only the target row) alongside `set_active_competition()`.
- [x] 1.4 Extend `guard_competitions_is_active` to fence `is_live` behind `app.allow_live_change` (mutable only via `set_league_live`).
- [x] 1.5 Add `league_id_for_slug(slug)` (stable, security definer, granted anon+authenticated); keep `active_competition_id()`.

## 2. Pools backend

- [x] 2.1 Migration `20260722000100_pool_create_league_guard.sql`: `create_group` gains optional `p_competition_id` + `is_live` guard; backward-compatible (null → active league).
- [x] 2.2 `join_code` already globally unique (unique constraint) and per-league prefixed — no change needed.
- [x] 2.3 `lib/groups.ts` `listMyPoolsByLeague()`: the caller's pools grouped by league, with member counts, for the cross-league home.
- [x] 2.4 `lib/competition.ts` `listLiveLeagues()`: catalog of live leagues (id, slug, name, short_name, brandCode, joinCodePrefix).

## 3. League context resolver (app layer)

- [x] 3.1 `lib/competition.ts`: `getLeagueBySlug()`, `getLeagueForPool()`, `getLeagueFromContext()` — resolve a league from a route slug or a pool id; return null ("league unavailable") for unknown/non-live.
- [x] 3.3 `resolveBranding(comp)` extracted; `getBrandingForLeague(comp)` added; `getActiveBranding()` unchanged (delegates to it). Product name stays "Winscore".
- [~] 3.2 **Deferred to `multi-league-pool-ui`.** Replacing the 28 `getActiveCompetition`/`getActiveBranding` callers is coupled to the `[league]` route context (§4) — doing it here would break the pages before routes exist. New resolver added alongside; old kept working.

## 4. Type shims

- [x] 4.1 Hand-patched `lib/database.types.ts` for the new schema (`competitions.is_live`, `create_group` arg, `league_id_for_slug`, `set_league_live`) since `supabase gen types` needs DB access. Regenerate on next `supabase db push`.

## 5. Verification

- [x] 5.1 `pnpm typecheck` clean, `pnpm lint` 0 errors, `pnpm test` 1117/1117 pass.
- [x] 5.2 `pnpm build` compiles + TypeScript passes (page-data env-gated only).

## Deferred to `multi-league-pool-ui` (follow-up change)

- §3.2 resolver caller swap (28 files) + 8 cron routes iterating live leagues
- Routing: `[league]` segment, move matches/leaderboard/my-picks under it, redirects
- Design system: tokens, fonts, `LeagueRail`, split-flap `Scoreline`
- UI: cross-league home (lanes), league catalog page, create-pool coupon flow, pool dashboard, join
- Cutover: flip launch leagues live; drop `is_active` / `active_competition_id()` / `set_active_competition()`
