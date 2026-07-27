## MODIFIED Requirements

### Requirement: Pools are league-scoped user boards

A **pool** SHALL be a user-created competitive board bound to exactly one league (`competition_id`). On creation the system SHALL persist the pool with the creating user as `role='owner'`, generate a unique `join_code` whose prefix derives from the league, and record the owner as a member. A pool's standings SHALL be computed only from its members' predictions in that league. The chosen league MUST have `status = 'active'` at creation time.

#### Scenario: Owner creates a pool in a live league

- **WHEN** a signed-in user submits a pool name and selects a league with `status = 'active'`
- **THEN** the system creates the pool with `owner_id` set to the user and `competition_id` set to the chosen league
- **AND** generates a unique `join_code` prefixed for that league (e.g. `LL-…` for La Liga)
- **AND** records the owner as a member with `role='owner'`

#### Scenario: Cannot create a pool in a league that is not active

- **WHEN** a user attempts to create a pool for a league whose `status` is `manage`, `upcoming`, or `finished`
- **THEN** the system rejects the request and creates no pool

#### Scenario: Anonymous visitor cannot create a pool

- **WHEN** a request without an authenticated session attempts to create a pool
- **THEN** the system rejects the request and creates no pool

### Requirement: Startable leagues list

The system SHALL expose leagues with `status = 'active'` as the source for the "start a pool" picker, and pool creation SHALL be permitted only for an active league. Leagues with a `status` of `manage`, `upcoming`, or `finished` SHALL NOT be startable. The list of startable leagues SHALL be resolved by a dedicated function distinct from the one backing the public catalog, which continues to include finished and upcoming leagues.

Every user-facing affordance that leads to pool creation SHALL be derived from the startable list, so a league that cannot accept a pool never presents a "Start a group" control.

#### Scenario: Active leagues returned as startable

- **WHEN** the system resolves the set of startable leagues
- **THEN** every league with `status = 'active'` is returned as startable
- **AND** leagues with a `status` of `manage`, `upcoming`, or `finished` are absent

#### Scenario: Upcoming league is absent from the create-pool picker

- **WHEN** a signed-in user opens the create-pool form
- **AND** a league has `status = 'upcoming'`
- **THEN** that league is not offered in the league selector

#### Scenario: Upcoming league lane hides its start control

- **WHEN** the cross-league home renders a lane for a league with `status = 'upcoming'`
- **THEN** the lane's "Start a group" control is absent
- **AND** the user's existing pools in that league remain listed and reachable

#### Scenario: Finished league is absent from the create-pool picker

- **WHEN** a signed-in user opens the create-pool form
- **AND** a league has `status = 'finished'`
- **THEN** that league is not offered in the league selector

#### Scenario: Finished league lane hides its start control

- **WHEN** the cross-league home renders a lane for a league with `status = 'finished'`
- **THEN** the lane's "Start a group" control is absent
- **AND** the user's existing pools in that league remain listed and reachable

#### Scenario: Catalog lists finished and upcoming leagues

- **WHEN** a visitor opens the league catalog
- **THEN** leagues with `status = 'finished'` or `status = 'upcoming'` are still listed

#### Scenario: Grouped pools resolve their league

- **WHEN** the caller's pools are listed grouped by league
- **THEN** each pool carries its league (`competition_id`, slug, name)
- **AND** the pools are grouped one lane per league

### Requirement: League catalog page

A signed-in user SHALL be able to browse all live leagues and upcoming leagues on a catalog page and start a pool in any of the active ones. Upcoming leagues SHALL appear with a "Coming Soon" badge and SHALL NOT be startable. Non-live, non-upcoming leagues SHALL NOT appear. Data comes from `listCatalogLeagues()`.

#### Scenario: Catalog lists live and upcoming leagues

- **WHEN** a user opens the league catalog
- **THEN** every live league appears as a startable option
- **AND** every upcoming league appears with a "Coming Soon" badge
- **AND** non-live, non-upcoming leagues do not appear

#### Scenario: Upcoming league is not startable from catalog

- **WHEN** a user opens the catalog
- **AND** a league has `status = 'upcoming'`
- **THEN** the "Start pool" control is not shown for that league

### Requirement: Finished-league badge in league selectors

The public league catalog, pool creation picker, `ManagedContextBar` league selector, and matches list header SHALL display a "Coming Soon" badge next to the league name for any competition with `status = 'upcoming'`, and a "Finished" badge for any with a non-null `finished_at`. The coming-soon badge SHALL use an accent style, the finished badge SHALL use a muted, outline style, and the active badge SHALL use a solid "Live" style — all three visually distinguishable.

#### Scenario: Upcoming league shows badge in catalog

- **WHEN** the league catalog is rendered
- **THEN** upcoming leagues show a "Coming Soon" badge
- **AND** the badge is distinguishable from "Live" and "Finished" badges

#### Scenario: Upcoming league shows badge in context bar

- **WHEN** a user navigates to an upcoming league via the `ManagedContextBar`
- **THEN** the league name in the selector shows a "Coming Soon" badge

#### Scenario: Finished league shows badge in context bar

- **WHEN** a user navigates to a finished league via the `ManagedContextBar`
- **THEN** the league name in the selector shows a "Finished" badge
- **AND** the badge is distinguishable from the "Live" badge used for active leagues

#### Scenario: Finished league appears in catalog with badge

- **WHEN** the league catalog is rendered
- **THEN** finished leagues appear with a "Finished" badge
- **AND** non-finished leagues do not show the badge

#### Scenario: No new pools can be created in a finished league

- **WHEN** a user attempts to create a pool in a finished league
- **THEN** the system rejects the request
- **AND** the league is not shown as a startable option
