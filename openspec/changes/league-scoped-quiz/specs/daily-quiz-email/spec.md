## ADDED Requirements

### Requirement: Quiz reminder targets the competition's question

The quiz reminder email SHALL be scoped to a competition: it SHALL be sent only when that competition has a question active for the current UTC day, its "question waiting" framing SHALL refer to that competition's question, and its call-to-action SHALL deep-link to the competition's league-scoped quiz route (`/[league]/quiz`) rather than the global `/quiz` path.

#### Scenario: Reminder sent for a competition with a question today
- **WHEN** the quiz reminder dispatch runs for a competition that has a question with `active_on` equal to today
- **THEN** eligible users receive a reminder whose deep link targets that competition's `/[league]/quiz` route

#### Scenario: No reminder when the competition has no question today
- **WHEN** a competition has no question with `active_on` equal to today
- **THEN** no quiz reminder is dispatched for that competition

#### Scenario: Deep link is league-scoped
- **WHEN** a quiz reminder email is rendered for a competition
- **THEN** its call-to-action URL points at the competition's league-scoped quiz route
