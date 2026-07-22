## MODIFIED Requirements

### Requirement: One active question per day

The system SHALL expose at most one active quiz question per competition per UTC calendar day, identified by an `active_on` date that is unique per `(competition_id, active_on)`. The league-scoped quiz page (`/[league]/quiz`) SHALL show the question whose `competition_id` is the resolved league's competition and whose `active_on` equals the current UTC date, and SHALL render a friendly empty state when none exists for that competition today.

#### Scenario: Today's question is shown for the league
- **WHEN** a question exists with `active_on` equal to the current UTC date and `competition_id` equal to the resolved league's competition
- **THEN** the `/[league]/quiz` page renders that question's prompt and options

#### Scenario: No question today for this league
- **WHEN** no question has `active_on` equal to the current UTC date for the resolved league's competition
- **THEN** the page renders a "no question today" empty state instead of an error

#### Scenario: Each competition has its own day's question
- **WHEN** two competitions each have a question with `active_on` equal to today
- **THEN** each league's quiz page shows only its own competition's question

### Requirement: Points and personal streak

The system SHALL award points for correct answers and SHALL show the signed-in user their current streak within the competition — the number of consecutive UTC days, ending today or yesterday, on which they answered a question for that competition.

#### Scenario: Correct answer earns points
- **WHEN** a user answers correctly
- **THEN** their quiz point total for that competition increases

#### Scenario: Streak reflects consecutive days within the competition
- **WHEN** a user has answered on each of the last N consecutive UTC days (ending today or yesterday) for a competition
- **THEN** that competition's quiz page shows a streak of N

#### Scenario: Streaks are independent per competition
- **WHEN** a user has different consecutive-day answer runs across two competitions
- **THEN** each league's quiz page shows the streak computed from that competition's answers only

### Requirement: Separate quiz leaderboard

The system SHALL provide a per-competition quiz leaderboard ranking players by total quiz points within that competition, then by earliest first answer. It SHALL be distinct from the prediction-pool leaderboard, which SHALL be unaffected.

#### Scenario: Ranking order within a competition
- **WHEN** a competition's quiz leaderboard is viewed
- **THEN** players are ordered by total quiz points for that competition descending, ties broken by earliest first answer

#### Scenario: Leaderboards are independent per competition
- **WHEN** a user earns quiz points in one competition
- **THEN** their rank on another competition's quiz leaderboard is unchanged

#### Scenario: Pool leaderboard unchanged
- **WHEN** a user earns quiz points
- **THEN** their position on the prediction-pool leaderboard does not change

### Requirement: Admin question authoring

The system SHALL let an admin create a quiz question with a competition, a prompt, options, the correct option, and an `active_on` date, plus optional Spanish, French, and German translations of the prompt and options. The `(competition_id, active_on)` pair SHALL be unique. A translation SHALL be accepted only when its prompt is non-blank and it provides exactly one non-blank option per English option (preserving order/index alignment); a fully blank translation block SHALL be ignored rather than rejected. Non-admins SHALL NOT be able to create or edit questions.

#### Scenario: Admin creates a question for a competition
- **WHEN** an admin submits a competition, prompt, options, correct option, and an `active_on` date
- **THEN** the question is stored and becomes the active question for that competition on that date

#### Scenario: Duplicate competition/day rejected
- **WHEN** an admin submits a question for a competition and `active_on` date that already has a question
- **THEN** the action is rejected and nothing is stored

#### Scenario: Admin adds translations
- **WHEN** an admin fills the Spanish, French, and/or German translation fields with a prompt and one option per English option
- **THEN** the translations are stored with the question and served to visitors in those locales

#### Scenario: Non-admin blocked
- **WHEN** a non-admin attempts to create or edit a question
- **THEN** the operation is denied by RLS
