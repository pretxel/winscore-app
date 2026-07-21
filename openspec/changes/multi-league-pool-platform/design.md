## Context

Today Winscore resolves a single global active competition and runs one league at a time. The schema is already competition-scoped (`matches`, `predictions`/`scores`, `leaderboard`, `groups` all carry `competition_id`), and `groups` are already league-scoped friend boards with `join_code` + owner/member roles. The only structural blocker to concurrent leagues is the single-active invariant (`competitions` partial unique index `where is_active`, plus `set_active_competition()`) and the app-wide assumption that exactly one league is active.

This change turns Winscore into a platform: several leagues live at once, and any fan creates league-scoped **pools** (the productized evolution of `groups`) their friends join by code. Audience: football fans who run prediction pools with friends across leagues. The signed-in home's single job: get a returning fan into their live pools across leagues, and let them start a new one in any live league.

## Goals / Non-Goals

**Goals:**
- Multiple leagues live concurrently (`is_live`, no single-active constraint).
- Pools as the primary competitive unit — league-scoped, created/joined by users, one user across many leagues.
- A cross-league home, league catalog, create-pool flow, and per-pool dashboard — with a distinctive, subject-grounded visual system.
- Preserve match-scoped scoring, kickoff-lock RLS, and per-competition leaderboards untouched.

**Non-Goals:**
- Cross-league pools (a pool is exactly one league).
- Public/discoverable pools — join stays invite-code only for this change.
- New scoring rules or formats (existing `format_config` per league stands).
- The visual brand mark rebrand (still governed by brand-identity; product name stays "Winscore").

## Frontend design system

> This section is the design reference for the follow-up UI change **`multi-league-pool-ui`**; the current change ships only the backend/data/resolver. It is kept here so the design intent is captured alongside the platform proposal.

Direction: **the matchday board** — a floodlit night-pitch surface, split-flap scoreboard heritage, and the classic football-pools coupon, modernized. Chosen deliberately against the three AI-default looks (cream+serif+terracotta; near-black+single-acid; broadsheet hairlines): the base is petrol-teal not near-black, the accent is warm floodlight-gold plus per-league identity hues (not one acid accent), and the display face is *expanded* (a stadium nameplate) rather than the condensed-Oswald cliché.

**Color** (design tokens):
- `--pitch` `#0C1B22` — base surface (night pitch under floodlights)
- `--pitch-raised` `#12262E` — lanes / cards
- `--turf-line` `#23383D` — hairline chalk dividers
- `--chalk` `#E7EFE9` — primary ink / pitch-line white
- `--floodlight` `#F5C451` — primary accent (scoreboard bulbs, trophy, CTAs)
- Per-league identity hue, used **only** on that league's lane rail and chip, drawn from the league's own crest (e.g. La Liga crimson `#E4002B`, World Cup green `#127A4B`). Never more than one league hue per lane.

**Type:**
- Display — **Archivo Expanded** (700/800): wide scoreboard-nameplate feel for league names and the hero; used with restraint (lane rails + hero only).
- Body — **Hanken Grotesk**: humanist grotesque, warmer than Inter.
- Data — **Geist Mono** (tabular figures): scorelines, ranks, join codes — the scoreline reads as a split-flap readout.

**Layout — league lanes.** The home is a vertical stack of full-width league lanes. Each lane: a left **vertical nameplate rail** (league name set vertically in Archivo Expanded on the league's hue, chalk-line border), then a horizontal region with the user's pool cards and a live/next fixtures strip (Geist Mono scorelines), and a per-lane "Start a pool" affordance. A catalog strip lists all live leagues. The create-pool flow reads like a modern pools coupon; the pool dashboard is single-league focus (fixtures coupon + standings).

```
┌───────────────────────────────────────────────┐
│  WINSCORE            ● 3 live · matchday 12     │
├──┬────────────────────────────────────────────┤
│L │  LA LIGA          you: 2nd of 14            │  rail hue = crimson
│A │  ┌pool┐ ┌pool┐   RMA 2–1 ATM · 19:00 next   │
│  │  └────┘ └────┘   Start a pool →             │
├──┼────────────────────────────────────────────┤
│W │  WORLD CUP 2026   you: 1st of 40            │  rail hue = green
│C │  ┌pool┐          BRA 3–0 CRO · FT           │
├──┴────────────────────────────────────────────┤
│  BROWSE LEAGUES →  [WC] [LL] [MX] [EPL] live    │
└───────────────────────────────────────────────┘
```

**Signature:** the vertical league nameplate rail paired with a **split-flap scoreline** that flips when a score updates — one memorable, subject-true element (stadium nameplate + flap-board). Everything else stays quiet.

**Motion:** staggered lane slide-in on load; split-flap flip only on a live score change (rides the existing realtime scores/leaderboard publications); hover-lift on pool cards. `prefers-reduced-motion` disables the flip and slide.

**Quality floor:** responsive to mobile (lanes stack, rail becomes a top chip), visible keyboard focus, reduced-motion respected.

## Decisions

- **`is_active` → `is_live`, drop the single-active index.** Additive: add `is_live`, backfill from `is_active`, remove the partial unique index; multiple rows may be live. *Alternative:* a separate `league_status` table — rejected as needless indirection over a boolean.
- **`set_active_competition()` → `set_league_live(id, bool)`.** Per-league guarded RPC; never displaces other leagues. Ship alongside the old RPC, cut over, then drop the old.
- **League context from route/pool, not a global flag.** Introduce a `[league]` route segment and `getLeagueFromContext()`; a pool resolves its own league from `competition_id`. Replace the single-active `getActiveCompetition()`/`getActiveBranding()` resolution with a league-scoped resolver. *Why:* concurrency has no single "the" competition. *Alternative:* keep a per-user "current league" cookie — rejected as hidden state; the URL should carry the league.
- **Pools reuse the `groups` table, productized.** `groups` already has `competition_id`, `join_code`, owner/member — surface it as "pool" in the product; `create_group`/`join_group` gain an `is_live`-league guard. *Alternative:* a new `pools` table — rejected (pure migration churn; groups already models it).
- **Leaderboard/standings unchanged.** Already competition-scoped; per-pool standings come from the existing group-standings path filtered by the pool's league.
- **Routing migration.** Existing single-competition pages (`/matches`, `/leaderboard`, `/my-picks`) move under `/[league]/…`; the root becomes the cross-league home. Old paths 308-redirect to the currently-most-relevant league (or the catalog).
- **Branding extends brand-identity.** Product name stays fixed "Winscore"; the league resolves as the edition/context per route (the rename change already decoupled product name from competition).

## Risks / Trade-offs

- **Broad cross-cutting change — "one active competition" is threaded through helpers, RLS, views, and pages.** → Replace the resolver first and let `pnpm typecheck` enumerate every caller; migrate route-by-route behind `[league]`. Ship additive DB so old and new paths coexist during cutover.
- **Live-DB data migration (is_active→is_live, RPC rename).** → Additive migration: add `is_live` backfilled from `is_active`, keep both flags + both RPCs until the app is cut over, then a follow-up drops the old. Rollback = revert app; DB stays backward-compatible.
- **URL/SEO change (routes gain a `[league]` segment).** → 308 redirects from old paths; canonical tags per league.
- **Empty/quiet leagues.** A live league with no fixtures yet would render an empty lane. → Lane empty state invites starting a pool; catalog only lists live leagues.
- **Scoring/RLS regressions.** Low — scoring is match-scoped and untouched; verify with the existing scoring unit tests.

## Migration Plan

1. **Schema (additive):** add `competitions.is_live` (backfill from `is_active`), drop the single-active partial unique index, add `set_league_live()` beside `set_active_competition()`.
2. **Resolver swap:** introduce `getLeagueFromContext()` + `league_id_for_slug()`; retarget branding/domain/sync callers surfaced by typecheck.
3. **Routes:** add the `[league]` segment; move matches/leaderboard/my-picks under it; add redirects.
4. **Pools backend:** guard `create_group`/`join_group` on `is_live`; expose list-my-pools-across-leagues.
5. **UI:** cross-league home (league lanes), league catalog, create-pool coupon flow, pool dashboard — apply the design system.
6. **Cutover + cleanup:** flip default leagues live; a follow-up migration drops `is_active` and `set_active_competition()`.
7. **Verify:** `pnpm typecheck` / `lint` / `test` / `build`; scoring unit tests green; manual smoke of two concurrent leagues.
8. **Rollback:** revert the app commit; the additive DB remains compatible.

## Open Questions

- Which leagues seed `is_live` at launch (WC 2026 + La Liga + Liga MX already seeded)?
- Do old single-competition URLs redirect to a specific default league or always to the catalog? (Leaning: catalog, to avoid guessing.)
- Public/discoverable pools and a pool size cap — deferred; invite-code only for now.
