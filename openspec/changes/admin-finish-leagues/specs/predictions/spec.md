## ADDED Requirements

### Requirement: Predictions blocked on finished leagues

The prediction submission and bulk-round-prediction paths SHALL check the competition's `finished_at` field and reject the submission when non-null, returning a localized "League is finished" error. This check SHALL run after authentication and before the per-match kickoff-lock and status checks, so a user on a finished league gets a clear finished message rather than a generic lock error.

#### Scenario: Submit prediction on a finished league
- **WHEN** a signed-in user submits a prediction for a match whose competition has `finished_at IS NOT NULL`
- **THEN** the system rejects the submission with "League is finished"
- **AND** no database write occurs

#### Scenario: Bulk round submission on a finished league
- **WHEN** a user submits predictions for multiple matches in a finished league
- **THEN** the bulk submission fails with "League is finished" before any per-match processing
- **AND** no individual predictions are written

#### Scenario: Viewing existing predictions on a finished league
- **WHEN** a user views their "My picks" page for a finished league
- **THEN** their existing predictions and scores are displayed normally
- **AND** no edit controls are shown for any match
