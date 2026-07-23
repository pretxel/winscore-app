## ADDED Requirements

### Requirement: Quiz share standing is competition-scoped

The shared quiz standing SHALL reflect the competition the standing belongs to, not a global aggregate. The public standing view (`v_quiz_standing`) SHALL expose `competition_id`, and the share landing page and its Open Graph card SHALL show the rank, points, and streak computed within that competition. The share call-to-action SHALL deep-link to that competition's league-scoped quiz route.

#### Scenario: Standing reflects the competition
- **WHEN** a visitor opens a quiz share link for a user's standing in a given competition
- **THEN** the rendered streak, points, and rank are computed from that competition's answers only

#### Scenario: Share CTA links to the league quiz
- **WHEN** the quiz share landing page renders its call-to-action
- **THEN** the link targets the competition's `/[league]/quiz` route

#### Scenario: Independent standings per competition
- **WHEN** a user has answered quizzes in two competitions
- **THEN** each competition's share link shows the standing for that competition, not a combined total
