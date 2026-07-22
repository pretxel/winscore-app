# multi-league-pools Specification

## Purpose
Multi-league pool platform — users create and join pools scoped to a specific live league.
## Requirements
### Requirement: Pools are league-scoped user boards

A **pool** SHALL be a user-created competitive board bound to exactly one league (`competition_id`). On creation the system SHALL persist the pool with the creating user as `role='owner'`, generate a unique `join_code` whose prefix derives from the league, and record the owner as a member. A pool's standings SHALL be computed only from its members' predictions in that league. The chosen league MUST be **live** at creation time.

#### Scenario: Owner creates a pool in a live league

- **WHEN** a signed-in user submits a pool name and selects a live league
- **THEN** the system creates the pool with `owner_id` set to the user and `competition_id` set to the chosen league
- **AND** generates a unique `join_code` prefixed for that league (e.g. `LL-…` for La Liga)
- **AND** records the owner as a member with `role='owner'`

#### Scenario: Cannot create a pool in a league that is not live

- **WHEN** a user attempts to create a pool for a league whose `is_live` is false
- **THEN** the system rejects the request and creates no pool

#### Scenario: Anonymous visitor cannot create a pool

- **WHEN** a request without an authenticated session attempts to create a pool
- **THEN** the system rejects the request and creates no pool

### Requirement: Join a pool by code

A signed-in user SHALL be able to join a pool by supplying its `join_code`, which adds **only the calling user** as `role='member'`. Direct membership insertion SHALL NOT be available to end users. A user MAY be a member of pools across multiple leagues at the same time.

#### Scenario: Valid code joins the caller

- **WHEN** a signed-in user submits a valid `join_code`
- **THEN** the system adds the calling user to the resolved pool as `role='member'`
- **AND** returns the pool's id and league

#### Scenario: Membership spans leagues

- **WHEN** a user is a member of a La Liga pool and joins a World Cup pool
- **THEN** both memberships coexist
- **AND** each pool's standings reflect only that pool's league

### Requirement: Live-league catalog data

The system SHALL expose the set of live leagues (those with `is_live = true`) as the source for a "start a pool" picker, and pool creation SHALL be permitted only for a live league. Leagues that are not live SHALL NOT be startable.

#### Scenario: Catalog data lists only live leagues

- **WHEN** the live-league catalog is queried
- **THEN** every league with `is_live = true` is returned as startable
- **AND** leagues with `is_live = false` are absent

#### Scenario: Grouped pools resolve their league

- **WHEN** the caller's pools are listed grouped by league
- **THEN** each pool carries its league (`competition_id`, slug, name)
- **AND** pools are grouped one lane per league

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

### Requirement: Pool owners can optionally configure matchday wagers
An owner SHALL be able to enable matchday wagers for an existing league-scoped pool or during pool creation, and the option SHALL be disabled by default. The configuration SHALL use exactly the deployment-approved token and a fixed integer-base-unit stake, MUST be authorized server-side, and MUST NOT change the pool's `competition_id`, membership, free standings, or join behavior.

#### Scenario: Owner creates a free-only pool
- **WHEN** an owner creates a pool without enabling matchday wagers
- **THEN** the pool is created with normal free behavior and no active wager configuration

#### Scenario: Owner enables wagering
- **WHEN** an owner selects the approved token display and a valid fixed stake within configured limits
- **THEN** the pool records an enabled configuration scoped to that pool and league
- **AND** members may still participate without wagering

#### Scenario: Member attempts configuration
- **WHEN** a non-owner directly invokes the wager configuration mutation
- **THEN** the server and database reject the change

### Requirement: Configuration changes do not rewrite initialized rounds
Pool wager configuration changes SHALL apply only to wager rounds that have not been initialized. An initialized round MUST retain its snapshotted mint, token program, decimals, stake, cluster, close, and program version; disabling future wagers MUST preserve claims and refunds for existing rounds.

#### Scenario: Stake changes between rounds
- **WHEN** an owner changes the fixed stake after one wager round is initialized
- **THEN** the initialized round keeps its original stake
- **AND** a later round uses the new validated stake

#### Scenario: Owner disables wagering with funds outstanding
- **WHEN** an owner disables new matchday wagers
- **THEN** new rounds cannot initialize from that configuration
- **AND** existing entrants retain settlement, claim, or refund access

### Requirement: Wager aggregates remain pool-and-league scoped
Wager rounds, participants, pots, standings, and settlement data SHALL be keyed by the existing pool plus explicit competition round and MUST include only pool members and matches from the pool's `competition_id`.

#### Scenario: Same user belongs to pools in two leagues
- **WHEN** the user views a wager round in one pool
- **THEN** no entry, fixture, pot, or result from the other league contributes

