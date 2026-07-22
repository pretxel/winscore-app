## Why

Winscore is now an umbrella brand, but the product underneath still runs **one league at a time**: `competitions` enforces a single-active invariant (partial unique index `where is_active`, switched only through `set_active_competition()`), and the whole app resolves a single global "active competition". A fan who wants a World Cup pool *and* a La Liga pool *and* a Liga MX pool has to wait for an operator to flip the active league. That is the opposite of a platform.

The data model is already competition-scoped (`matches`, `predictions`/`scores`, `leaderboard`, and `groups` all carry `competition_id`), so the blocker is narrow: the single-active constraint plus the app-wide assumption of one active league. Lifting it turns Winscore into a **multi-league pools platform** where any signed-in fan picks a live league and spins up a pool their friends join by code — the league-scoped evolution of today's friend groups.

## What Changes

> **Scope (this change):** the **backend, data model, and resolver** below — additive and shippable at every step. The `[league]` routing, the design system, and the UI screens are split into the follow-up change **`multi-league-pool-ui`**; the design direction lives in this change's design.md as its reference.

- **Concurrent active leagues.** Replace the single-active invariant with an `is_live` flag that any number of competitions can hold at once. `set_active_competition()` becomes `set_league_live(slug, bool)`; the app no longer has one global active competition — league is resolved from the route/pool context.
- **Pools become the primary competitive unit.** A **pool** is a user-created, league-scoped board (the evolution of `groups`): it has an owner, members joined by `join_code`, an explicit `competition_id`, and its own standings computed from members' predictions in that league. A single user holds pools across many leagues simultaneously.
- **Cross-league home.** A signed-in home organized as **league lanes** — one horizontal band per league the user has a pool in (or can join), each showing live/next fixtures, the user's pool standing, and a "Start a pool" affordance. Plus a league catalog to open a pool in any live league.
- **Create-pool flow with league selection.** Creating a pool starts by choosing a live league, then naming the pool; the join code prefix derives from the league (`WC`, `LL`, `MX`, …).
- **Per-league scoring & leaderboards resolve by context.** `getActiveBranding`/active-competition helpers are replaced by a request/pool-scoped league resolver; leaderboard views/functions already take a competition and stay per-league. Global "the leaderboard" becomes "this pool's / this league's leaderboard".
- **A distinctive frontend design system** for the platform (matchday-board direction — see design.md), applied to the home, league catalog, create-pool flow, and pool dashboard.

## Capabilities

### New Capabilities
- `multi-league-pools`: user-created, league-scoped pools as the primary competitive unit; a cross-league home (league lanes) listing the user's pools per live league; a league catalog; a create-pool flow that selects a live league; per-pool standings scoped to that league. Pools extend the existing `groups` primitive with an explicit, first-class league.

### Modified Capabilities
- `competition-management`: the "at most one active competition" invariant is removed. Multiple competitions MAY be **live** concurrently (`is_live`), toggled per league. The app resolves the current league from the route/pool context rather than a single global active competition; admin can bring a league on/offline without displacing others.

## Impact

- **Schema (migrations):** relax the single-active partial unique index → per-row `is_live`; rename/replace `set_active_competition()` → `set_league_live()`; `groups` gains first-class pool semantics (already has `competition_id`); `join_code` prefix per league. No change to `predictions`/`scores`/`matches` shape.
- **Backend:** replace global `getActiveCompetition()`/`getActiveBranding()` single-active resolution with a league-context resolver (from route param / pool id); `create_group`/`join_group` become pool operations that require a live league; leaderboard resolution stays competition-scoped.
- **App (routes/UI):** new signed-in home (league lanes), league catalog, create-pool flow, per-pool dashboard; league becomes a route segment (`/[league]/…`). Existing single-competition pages migrate to league-scoped routes.
- **Branding:** product name stays fixed "Winscore"; the league (not a single global competition) resolves as the edition/context per route — extends the brand-identity model from the rename change.
- **RLS/scoring:** kickoff-lock and per-match recompute are unchanged (already match-scoped); leaderboard/pool standings already filter by `competition_id`.
- **Migration risk:** the "one active competition" assumption is threaded through many helpers and pages — this is a broad, cross-cutting change (see design.md for the sequencing and rollback).
