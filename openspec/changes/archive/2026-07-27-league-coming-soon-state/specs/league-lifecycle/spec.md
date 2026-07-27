## ADDED Requirements

### Requirement: Upcoming league lifecycle state

The competition lifecycle SHALL include an `upcoming` status that represents a league which is visible to users but not yet open for pool creation or predictions. The full lifecycle is `manage` (hidden, draft) → `upcoming` (visible, not startable) → `active` (live, startable) → `finished` (results only). The `upcoming` status SHALL be set by an admin via the admin panel.

An upcoming league SHALL be accessible at its slug URL and SHALL render a coming-soon placeholder page rather than redirecting to the catalog. The page SHALL indicate the league is not yet accepting pools.

#### Scenario: Upcoming league is accessible at its slug

- **WHEN** a user navigates to `/la-liga/matches`
- **AND** La Liga has `status = 'upcoming'`
- **THEN** the page renders a coming-soon placeholder for La Liga
- **AND** does not redirect to the catalog

#### Scenario: Upcoming league slug shows placeholder

- **WHEN** a user navigates to an upcoming league's slug
- **THEN** the page displays a message that the league is coming soon
- **AND** does not show match data or prediction scoring

#### Scenario: Admin can set a league to upcoming

- **WHEN** an admin updates a competition's status to `upcoming`
- **THEN** the competition status is persisted as `upcoming`
- **AND** the league becomes visible in the public catalog

#### Scenario: Upcoming league appears in catalog

- **WHEN** a user opens the league catalog
- **THEN** leagues with `status = 'upcoming'` appear in the listing
- **AND** show a "Coming Soon" badge
- **AND** cannot be used to create a pool

#### Scenario: Notifications not sent for upcoming leagues

- **WHEN** a cron job or notification service evaluates leagues
- **AND** a league has `status = 'upcoming'`
- **THEN** no notifications specific to that league are dispatched
