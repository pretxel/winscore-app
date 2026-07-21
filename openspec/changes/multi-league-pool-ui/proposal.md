## Why

`multi-league-pool-platform` shipped the backend for concurrent leagues + league-scoped pools: `competitions.is_live`, `set_league_live()`, `league_id_for_slug()`, `getLeagueFromContext()`, `listLiveLeagues()`, `listMyPoolsByLeague()`, and a `create_group` that requires a live league. The app still renders through the old single-active resolver, so none of that reaches users yet. This change is the **product surface** — the routing, design system, and screens that turn the multi-league backend into the platform fans actually use — and the cutover that retires the single-active machinery.

## What Changes

- **`[league]` routing.** Introduce a `[league]` route segment; move the single-competition pages (`matches`, `leaderboard`, `my-picks`, `standings`, `bracket`) under `/[league]/…` resolving via `getLeagueFromContext({ slug })`. Old paths 308-redirect to the league catalog.
- **Resolver caller swap (finishes platform §3.2).** Replace the 28 `getActiveCompetition()`/`getActiveBranding()` call sites with the context resolver; the 8 cron routes iterate every live league instead of the one active competition. Then retire `is_active`, `active_competition_id()`, and `set_active_competition()`.
- **Design system — "the matchday board".** Design tokens (floodlit-pitch palette + per-league identity hue), fonts (Archivo Expanded / Hanken Grotesk / Geist Mono), and the signature primitives `LeagueRail` (vertical nameplate) and `Scoreline` (split-flap, reduced-motion aware).
- **Cross-league home (league lanes).** A signed-in home stacking one lane per league the user has a pool in, each with the league identity rail, the user's pool cards, live/next fixtures, and "Start a pool"; empty state shows the catalog. Backed by `listMyPoolsByLeague()`.
- **League catalog page.** Browse all live leagues and start a pool in any of them. Backed by `listLiveLeagues()`.
- **Create-pool flow (coupon aesthetic).** Select a live league → name the pool → create (passing `p_competition_id`), then surface the generated `join_code`.
- **Pool dashboard.** Single-league focus resolved from the pool: that league's fixtures, the member's predictions, the pool standings. Plus a join-by-code entry point.

## Capabilities

### New Capabilities
<!-- None. The pool/league behavior is specified by multi-league-pool-platform; this change delivers its product surface. -->

### Modified Capabilities
- `multi-league-pools`: adds the user-facing surface — cross-league home (league lanes), create-pool flow, pool dashboard, join entry point, and the `[league]` route segment with legacy redirects — on top of the data/resolver requirements already specified.

## Impact

- **Depends on:** `multi-league-pool-platform` (backend/resolver) must be applied first.
- **Routes/UI:** new `[league]` segment; moved pages + redirects; new home, catalog, create-pool flow, pool dashboard, join. Applies the design system to these surfaces.
- **Backend callers:** 28 resolver call sites retargeted; 8 cron routes iterate live leagues; branding resolves per route via `getBrandingForLeague`.
- **Schema (cleanup migration):** drop `is_active`, `active_competition_id()`, `set_active_competition()` once no caller depends on them; flip launch leagues live via `set_league_live()`.
- **SEO:** old URLs 308-redirect; per-league canonical + edition subtitle.
- **Risk:** broad, app-breaking until complete — sequence resolver-swap → routes → cutover behind typecheck; keep the additive backend compatible so rollback is a revert of this change only.
