## MODIFIED Requirements

### Requirement: Pools are league-scoped user boards

A **pool** SHALL be a user-created competitive board bound to exactly one league (`competition_id`). On creation the system SHALL persist the pool with the creating user as `role='owner'`, generate a unique `join_code` whose prefix derives from the league, and record the owner as a member. A pool's standings SHALL be computed only from its members' predictions in that league. The chosen league MUST have `status = 'active'` at creation time.

#### Scenario: Owner creates a pool in a live league

- **WHEN** a signed-in user submits a pool name and selects a league with `status = 'active'`
- **THEN** the system creates the pool with `owner_id` set to the user and `competition_id` set to the chosen league
- **AND** generates a unique `join_code` prefixed for that league (e.g. `LL-…` for La Liga)
- **AND** records the owner as a member with `role='owner'`

#### Scenario: Cannot create a pool in a league that is not active

- **WHEN** a user attempts to create a pool for a league whose `status` is `manage` or `finished`
- **THEN** the system rejects the request and creates no pool

#### Scenario: Anonymous visitor cannot create a pool

- **WHEN** a request without an authenticated session attempts to create a pool
- **THEN** the system rejects the request and creates no pool

### Requirement: Startable leagues list

The system SHALL expose leagues with `status = 'active'` as the source for a "start a pool" picker, and pool creation SHALL be permitted only for an active league. Leagues with `status` of `manage` or `finished` SHALL NOT be startable.

#### Scenario: Active leagues returned as startable

- **WHEN** the system resolves the set of startable leagues
- **THEN** every league with `status = 'active'` is returned as startable
- **AND** leagues with `status` of `manage` or `finished` are absent
