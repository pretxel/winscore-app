## ADDED Requirements

### Requirement: Cross-league home shows the user's pools per live league

The signed-in home SHALL present the user's pools grouped by league as **league lanes** — one band per league in which the user owns or belongs to a pool. Each lane SHALL show the league identity, the user's pool cards, the live or next fixtures for that league, and an affordance to start another pool in that league. Data comes from `listMyPoolsByLeague()`.

#### Scenario: Home lists pools across leagues

- **WHEN** a signed-in user with pools in two leagues opens the home
- **THEN** the home renders one lane per league
- **AND** each lane shows that user's pool(s) and the league's live/next fixtures

#### Scenario: Empty state invites the first pool

- **WHEN** a signed-in user with no pools opens the home
- **THEN** the home shows the league catalog and a primary action to start a pool

### Requirement: League catalog page

A signed-in user SHALL be able to browse all live leagues on a catalog page and start a pool in any of them. Non-live leagues SHALL NOT appear as startable. Data comes from `listLiveLeagues()`.

#### Scenario: Catalog lists only live leagues

- **WHEN** a user opens the league catalog
- **THEN** every live league appears as a startable option
- **AND** non-live leagues do not appear

### Requirement: Create-pool flow selects a live league

Creating a pool SHALL start by choosing a live league, then naming the pool; on submit the system SHALL create the pool in that league (passing `p_competition_id`) and surface the generated `join_code`.

#### Scenario: User creates a pool in a chosen league

- **WHEN** a signed-in user selects La Liga, names a pool, and submits
- **THEN** the pool is created in La Liga
- **AND** the flow shows the pool's `join_code` to share

### Requirement: Pool dashboard is scoped to its league

A pool's dashboard SHALL resolve its league from the pool (`getLeagueFromContext({ poolId })`) and SHALL show that league's fixtures, the member's predictions, and the pool standings within that league only. Kickoff-lock and per-match scoring are unchanged and remain match-scoped.

#### Scenario: Pool dashboard reflects only its league

- **WHEN** a member opens a La Liga pool's dashboard
- **THEN** it shows La Liga fixtures and the pool's La Liga standings
- **AND** shows no fixtures or standings from other leagues

### Requirement: League route segment and legacy redirects

Single-competition pages SHALL live under a `[league]` route segment (`/[league]/matches`, `/[league]/leaderboard`, `/[league]/my-picks`, …) resolving the league via `getLeagueFromContext({ slug })`. A request to an unknown or non-live league slug SHALL route to the league catalog. Legacy single-competition paths SHALL 308-redirect to the catalog.

#### Scenario: Route segment resolves the league

- **WHEN** a request targets `/la-liga/matches`
- **THEN** the page renders La Liga fixtures scoped to that league

#### Scenario: Legacy path redirects

- **WHEN** a request targets the old `/matches` path
- **THEN** it 308-redirects to the league catalog

#### Scenario: Unknown league routes to catalog

- **WHEN** a request targets `/not-a-league/matches`
- **THEN** it routes to the league catalog without throwing
