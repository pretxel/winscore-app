## ADDED Requirements

### Requirement: Competition status lifecycle

The system SHALL support three competition statuses: `active`, `manage`, and `finished`, stored in a `status` text column on the `competitions` table with a CHECK constraint limiting values to those three.

#### Scenario: New competition defaults to manage
- **WHEN** a competition row is inserted without an explicit status
- **THEN** the row's status SHALL be `manage`

#### Scenario: Invalid status rejected
- **WHEN** an INSERT or UPDATE attempts to set status to a value outside (`active`, `manage`, `finished`)
- **THEN** the database SHALL reject the write with a constraint violation

### Requirement: Active competitions visible in catalog

Competitions with `status = 'active'` SHALL be visible to all users in the public `/catalog` page. Users SHALL be able to join pools, make predictions, and view matches for active competitions.

#### Scenario: Active competition appears in catalog
- **WHEN** Liga MX has `status = 'active'`
- **THEN** the catalog page renders a card for Liga MX
- **AND** the card is interactive (links to the competition's matches page)

### Requirement: Manage competitions hidden from catalog

Competitions with `status = 'manage'` SHALL NOT appear in the public `/catalog` page. They SHALL be visible only in the admin competition list for configuration and testing purposes.

#### Scenario: Manage competition hidden from public
- **WHEN** La Liga has `status = 'manage'` and a public user visits `/catalog`
- **THEN** no card for La Liga is rendered

#### Scenario: Admin sees manage competitions
- **WHEN** an admin opens the competition list in the admin panel
- **THEN** competitions with `status = 'manage'` are visible and editable

### Requirement: Finished competitions visible in catalog with tag

Competitions with `status = 'finished'` SHALL appear in the public `/catalog` page with a visible "Finished" tag. Results and standings SHALL remain viewable, but predictions SHALL be closed.

#### Scenario: Finished competition appears with tag
- **WHEN** World Cup 2026 has `status = 'finished'`
- **THEN** the catalog page renders a card for World Cup 2026
- **AND** the card displays a "Finished" tag
- **AND** the card links to the results/standings view

#### Scenario: Finished competition predictions closed
- **WHEN** a competition has `status = 'finished'`
- **THEN** users cannot submit new predictions for any match in that competition
