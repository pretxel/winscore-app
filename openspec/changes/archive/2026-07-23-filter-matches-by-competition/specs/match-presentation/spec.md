## MODIFIED Requirements

### Requirement: Matches page loads competition-scoped fixtures

The `/matches` page for a competition SHALL query the `matches` table filtered by `competition_id` matching the resolved league, ordered by `kickoff_at` ascending.

#### Scenario: Only competition matches shown
- **WHEN** a user visits `/en/liga-mx-apertura-2026/matches`
- **THEN** only matches with `competition_id` matching Liga MX are loaded
- **AND** matches from other competitions (World Cup, La Liga) are not visible
