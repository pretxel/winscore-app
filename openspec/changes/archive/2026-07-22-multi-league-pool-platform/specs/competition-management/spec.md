## RENAMED Requirements

- FROM: `### Requirement: At most one active competition`
- TO: `### Requirement: Multiple leagues may be live concurrently`

- FROM: `### Requirement: Active competition switched only via a guarded RPC`
- TO: `### Requirement: League live status toggled per league via a guarded RPC`

- FROM: `### Requirement: Active competition resolution helper`
- TO: `### Requirement: League resolution from route or pool context`

## MODIFIED Requirements

### Requirement: Multiple leagues may be live concurrently

The system SHALL allow any number of competitions to be **live** at the same time via a per-row `is_live` boolean. There SHALL be no uniqueness constraint on `is_live`; the previous single-active partial unique index is removed. A league being live means users may create and play pools in it; toggling one league's `is_live` SHALL NOT affect any other league.

#### Scenario: Two leagues live at once

- **WHEN** `world-cup-2026` and `la-liga` both have `is_live = true`
- **THEN** the database accepts both
- **AND** users can create pools in either league

#### Scenario: Taking a league offline leaves others live

- **WHEN** an admin sets `la-liga` `is_live = false` while `world-cup-2026` stays live
- **THEN** `la-liga` is no longer startable
- **AND** `world-cup-2026` remains live and unaffected

### Requirement: League live status toggled per league via a guarded RPC

The system SHALL expose `set_league_live(p_id uuid, p_live boolean)` as the sole mutation path for `is_live`. It SHALL require admin privileges, raise if `p_id` does not exist, set only the target league's flag, and revalidate that league's affected paths and leaderboard cache tag. It SHALL NOT displace any other league's live status.

#### Scenario: Admin brings a league online

- **WHEN** an admin calls `set_league_live` with an existing id and `true`
- **THEN** that league's `is_live` becomes true without changing any other league
- **AND** the league's paths and leaderboard cache tag are revalidated

#### Scenario: Non-admin cannot toggle

- **WHEN** a non-admin calls `set_league_live`
- **THEN** the call is rejected and no `is_live` value changes

#### Scenario: Unknown league id raises

- **WHEN** `set_league_live` is called with an id that does not exist
- **THEN** the function raises an error and no `is_live` value changes

### Requirement: League resolution from route or pool context

The system SHALL resolve the current league from the request context — a `[league]` route segment or a pool's `competition_id` — rather than from a single global active competition. `getLeagueFromContext()` (request-cached) SHALL return the league for the current route/pool, and `active_competition_id()` is replaced by `league_id_for_slug(slug)` used by views, RLS, domain, UI, and sync scoped to that league. There is no single global "active competition".

#### Scenario: Route segment resolves the league

- **WHEN** a request targets `/la-liga/...`
- **THEN** `getLeagueFromContext()` resolves to the La Liga competition
- **AND** fixtures, scoring, and standings on that request are scoped to La Liga

#### Scenario: Pool resolves its own league

- **WHEN** a member opens a pool
- **THEN** the league resolves from the pool's `competition_id`
- **AND** does not depend on any global active flag

#### Scenario: Unknown or non-live league

- **WHEN** a request targets a league slug that does not exist or is not live
- **THEN** resolution returns a "league unavailable" state without throwing
- **AND** the UI routes to the league catalog
