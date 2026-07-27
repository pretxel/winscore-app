## MODIFIED Requirements

### Requirement: Startable leagues list

The system SHALL expose leagues with `status = 'active'` as the source for the "start a pool" picker, and pool creation SHALL be permitted only for an active league. Leagues with a `status` of `manage` or `finished` SHALL NOT be startable. The list of startable leagues SHALL be resolved by a dedicated function distinct from the one backing the public catalog, which continues to include finished leagues.

Every user-facing affordance that leads to pool creation SHALL be derived from the startable list, so a league that cannot accept a pool never presents a "Start a group" control.

#### Scenario: Active leagues returned as startable

- **WHEN** the system resolves the set of startable leagues
- **THEN** every league with `status = 'active'` is returned as startable
- **AND** leagues with a `status` of `manage` or `finished` are absent

#### Scenario: Finished league is absent from the create-pool picker

- **WHEN** a signed-in user opens the create-pool form
- **AND** a league has `status = 'finished'`
- **THEN** that league is not offered in the league selector

#### Scenario: Finished league lane hides its start control

- **WHEN** the cross-league home renders a lane for a league with `status = 'finished'`
- **THEN** the lane's "Start a group" control is absent
- **AND** the user's existing pools in that league remain listed and reachable

#### Scenario: Catalog still lists finished leagues

- **WHEN** a visitor opens the league catalog
- **THEN** leagues with `status = 'finished'` are still listed

#### Scenario: Grouped pools resolve their league

- **WHEN** the caller's pools are listed grouped by league
- **THEN** each pool carries its league (`competition_id`, slug, name)
- **AND** the pools are grouped one lane per league

## ADDED Requirements

### Requirement: Pool creation in a non-active league is explained

When pool creation is rejected because the chosen league is not active, the system SHALL surface a specific, localized message stating that the league is no longer accepting pools, rather than a generic error. The server-side guard SHALL remain the authoritative check, so a league that finishes after a form is rendered still cannot receive a pool.

#### Scenario: League finishes while the form is open

- **WHEN** a user submits the create-pool form for a league that has since become `finished`
- **THEN** no pool is created
- **AND** the user is shown a message identifying the league as no longer accepting pools

#### Scenario: Other failures stay generic

- **WHEN** pool creation fails for a reason other than the league not being active
- **THEN** the existing generic error message is shown
