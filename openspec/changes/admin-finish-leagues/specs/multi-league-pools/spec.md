## ADDED Requirements

### Requirement: Finished-league badge in league selectors

The public league catalog, pool creation picker, `ManagedContextBar` league selector, and matches list header SHALL display a "Finished" badge next to the league name for any competition with a non-null `finished_at`. The finished badge SHALL use a muted, outline style to distinguish it from the "Live" badge.

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
