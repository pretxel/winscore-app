## ADDED Requirements

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

<!-- UI requirements (cross-league home lanes, pool dashboard rendering) are
delivered by the follow-up change `multi-league-pool-ui`. -->

