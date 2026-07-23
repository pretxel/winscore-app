# competition-management Specification

## Purpose
TBD - created by archiving change support-multiple-competitions. Update Purpose after archive.
## Requirements
### Requirement: Competitions registry

The system SHALL store competitions in a `public.competitions` table, each with a unique `slug`, display `name`/`short_name`, `season`, `tournament_start_at`, opening-fixture fallback fields, `format_config` (JSONB), `providers` (JSONB), `branding` (JSONB), and a `status` text column constrained to `active`, `manage`, or `finished` with a default of `manage`.

#### Scenario: World Cup 2026 seeded as a competition

- **WHEN** the migrations and seed run
- **THEN** a `competitions` row with `slug = 'world-cup-2026'` exists
- **AND** its `format_config` encodes the legacy stages (`group,r32,r16,qf,sf,third,final`) and group pattern `^[A-L]$`

#### Scenario: Adding a competition requires no code change

- **WHEN** an operator inserts a new `competitions` row with a valid `format_config`
- **THEN** the insert succeeds without any application code or DDL change

### Requirement: Admin form supports league-stage competition setup

The admin competition form SHALL allow configuring league-stage competitions. The format config editor SHALL handle:
- Selecting `league` as a stage kind
- Configuring `pointMultiplier` per stage
- Adding teams associated with the competition

#### Scenario: Admin creates a league-format competition

- **WHEN** an admin opens the competition form and adds a stage with `kind: 'league'`
- **THEN** the form accepts it without requiring group configuration
- **AND** the stage shows a `pointMultiplier` field (defaulting to 1)

#### Scenario: Admin views Liga MX competition

- **WHEN** an admin opens the Liga MX competition for editing
- **THEN** the form shows all 5 tabs (Identity, Dates, Format, Providers, Branding) pre-populated with Liga MX values
- **AND** the format tab shows the league stage and liguilla knockout stages with their multipliers

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

### Requirement: Managed competition context (admin-only) distinct from the active competition

The admin SHALL maintain a managed-competition context that is independent of the public active competition. It SHALL be persisted in an httpOnly, sameSite=lax, admin-only cookie and resolved server-side by `getManagedCompetition()` (request-cached, loaded via the service-role client so a non-active competition is readable). When the cookie is absent, invalid, or points to a deleted competition, resolution SHALL fall back to `active_competition_id()` and clear the stale cookie. Switching managed SHALL be a non-destructive `setManagedCompetition(id)` server action that validates the id exists, sets the cookie, and revalidates the admin layout; it SHALL NOT modify `is_active`.

#### Scenario: Default managed equals active

- **WHEN** an admin with no managed cookie set opens the admin while only `world-cup-2026` exists
- **THEN** the managed competition resolves to `world-cup-2026` (the active competition)
- **AND** no behavior differs from before

#### Scenario: Switching managed never changes public

- **WHEN** an admin selects a non-active competition as managed
- **THEN** the cookie updates and the admin scope changes
- **AND** `is_active` and what end users see are unchanged

#### Scenario: Stale managed cookie falls back

- **WHEN** the managed cookie points to a competition that was deleted
- **THEN** `getManagedCompetition()` falls back to the active competition and clears the stale cookie without throwing

### Requirement: Active-vs-managed surfaced unmistakably across the admin

Every admin page SHALL display both the active competition (public) and the managed competition (editing context). When they coincide it SHALL render a calm `role="status"` indicator; when they diverge it SHALL render a prominent `role="alert"` warning that the managed competition is not live and visitors still see the active one, with a quick action to switch managed to the live competition.

#### Scenario: Diverged context warns

- **WHEN** the managed competition differs from the active competition
- **THEN** an alert-styled banner stating that edits are not visible to visitors is shown on every admin page, including `/admin/matches`

#### Scenario: Coinciding context is calm

- **WHEN** the managed competition equals the active competition
- **THEN** a single non-alarming status line indicating you are managing the live competition is shown

### Requirement: Admin form exposes status selector

The admin competition form SHALL render a status selector with three options: `active`, `manage`, and `finished`. Changing the status SHALL update the competition's `status` column. The selector SHALL replace the previous `is_live` toggle.

#### Scenario: Admin sets competition to active
- **WHEN** an admin selects `active` from the status dropdown and saves
- **THEN** the competition's `status` is set to `active`
- **AND** the competition appears in the public catalog

#### Scenario: Admin sets competition to manage
- **WHEN** an admin selects `manage` from the status dropdown and saves
- **THEN** the competition's `status` is set to `manage`
- **AND** the competition is hidden from the public catalog

#### Scenario: Admin sets competition to finished
- **WHEN** an admin selects `finished` from the status dropdown and saves
- **THEN** the competition's `status` is set to `finished`
- **AND** the competition appears in the catalog with a "Finished" tag

