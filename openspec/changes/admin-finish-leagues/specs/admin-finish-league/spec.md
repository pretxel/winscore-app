## ADDED Requirements

### Requirement: Admin can finish a league

The system SHALL provide an admin-only `finish_league(p_id uuid)` function that sets `finished_at = now()` on the target competition. The function MUST be security-definer with fixed `search_path`, MUST check `public.is_admin()`, and MUST refuse to finish an already-finished league.

#### Scenario: Admin finishes an active league
- **WHEN** an admin confirms the "Finish league" action for a live competition
- **THEN** `competitions.finished_at` is set to the current timestamp
- **AND** the league shows a "Finished" badge in admin and public views

#### Scenario: Cannot finish an already-finished league
- **WHEN** an admin attempts to finish a league that already has a non-null `finished_at`
- **THEN** the function returns without changing the timestamp
- **AND** no error is thrown

#### Scenario: Non-admin cannot finish a league
- **WHEN** a non-admin user directly invokes the finish mutation
- **THEN** the server and database reject the request

### Requirement: Admin can restart a finished league

The system SHALL provide an admin-only `restart_league(p_id uuid)` function that sets `finished_at = NULL` on the target competition. The function MUST follow the same security pattern as `finish_league`.

#### Scenario: Admin restarts a finished league
- **WHEN** an admin confirms the "Restart league" action for a finished competition
- **THEN** `competitions.finished_at` is set to NULL
- **AND** the finished badge is removed

#### Scenario: Non-admin cannot restart a league
- **WHEN** a non-admin user directly invokes the restart mutation
- **THEN** the server and database reject the request

### Requirement: Finished leagues block predictions

The system SHALL refuse any prediction submission for a match whose competition has a non-null `finished_at`. The rejection MUST occur in the prediction Server Action before the database write, returning a clear "League is finished" error to the user.

#### Scenario: User attempts prediction on a finished league
- **WHEN** a user submits a prediction for a match in a finished competition
- **THEN** the server action returns an error with "League is finished"
- **AND** no prediction row is written

#### Scenario: Already-submitted predictions remain accessible
- **WHEN** a league is finished after a user has submitted predictions
- **THEN** the user can still view their own predictions and scores
- **AND** the leaderboard remains readable
