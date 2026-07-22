## ADDED Requirements

### Requirement: Users can submit a round of free predictions together
The system SHALL allow an authenticated user to submit valid exact-score predictions for multiple matches in one explicit competition round. Each row MUST retain the existing uniqueness, score range, ownership, and database-enforced per-match kickoff lock, so a late match failure cannot permit a forbidden write.

#### Scenario: All round fixtures are open
- **WHEN** an authenticated user submits valid scores for every open match in a round
- **THEN** each prediction is inserted or updated for that user and match under the existing rules

#### Scenario: One fixture is already locked
- **WHEN** a bulk submission includes a fixture whose kickoff has arrived
- **THEN** the locked prediction is not inserted or changed
- **AND** the response identifies the free-pick outcome without initiating a wager for an incomplete round

### Requirement: Round submission does not weaken per-match editing
Free predictions submitted through the round sheet SHALL remain editable independently until each match's own kickoff, exactly like predictions submitted from a match detail page. A round wager close MUST NOT impose an earlier lock on the live `predictions` table.

#### Scenario: Wager round closed but later fixture not started
- **WHEN** a free prediction's match kickoff is still in the future after the wager round has closed
- **THEN** the user may update that free prediction under the existing policy
- **AND** any immutable wager snapshot remains unchanged

### Requirement: Wager snapshot creation is not a prediction mutation
Creating or confirming a wager SHALL copy the user's complete current round predictions to separate immutable storage and MUST NOT replace, update, delete, or change visibility rules for `predictions`.

#### Scenario: Snapshot is created
- **WHEN** a user prepares an eligible wager entry
- **THEN** normal prediction rows retain their IDs and edit semantics
- **AND** separate immutable rows represent wager picks

### Requirement: Free predictions survive all wager failures
No wallet-link, signing, RPC, token-account, blockhash, program, confirmation, or reconciliation error SHALL roll back or delete valid free predictions already accepted by the normal prediction path.

#### Scenario: Wallet has insufficient token balance
- **WHEN** free round predictions save and the later entry transfer fails for insufficient balance
- **THEN** the free predictions remain saved
- **AND** no wager entry is marked confirmed

