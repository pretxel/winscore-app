## ADDED Requirements

### Requirement: Quiz is a league-scoped route

The Daily Call quiz SHALL live under the `[league]` route segment (`/[league]/quiz`), resolving the league via `getLeagueFromContext({ slug })` like the other single-competition pages. A request for an unknown or non-live league slug SHALL route to the league catalog. The legacy `/quiz` path SHALL redirect to a league-scoped quiz (the active competition's, falling back to the catalog when none is active).

#### Scenario: League route resolves the quiz
- **WHEN** a request targets `/la-liga/quiz`
- **THEN** the page renders the Daily Call quiz scoped to La Liga's competition

#### Scenario: Legacy quiz path redirects
- **WHEN** a request targets the old `/quiz` path
- **THEN** it redirects to a league-scoped quiz (or the league catalog when no competition is active)

#### Scenario: Unknown league routes to catalog
- **WHEN** a request targets `/not-a-league/quiz`
- **THEN** it routes to the league catalog without throwing
