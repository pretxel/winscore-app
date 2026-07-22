# matchday-picks Specification

## Purpose
TBD - created by archiving change solana-matchday-wagers. Update Purpose after archive.
## Requirements
### Requirement: Pool members can complete one round sheet
The system SHALL provide a locale-aware pool-and-round view containing every eligible fixture, each current free prediction, pick completeness, pool identity, league, round label, and the effective close shown in the visitor's local timezone.

#### Scenario: Member opens a round sheet
- **WHEN** a member opens a round in a pool
- **THEN** only fixtures from the pool's competition and selected round are shown
- **AND** each fixture shows the member's current free prediction state

#### Scenario: Non-member opens a private pool round
- **WHEN** an authenticated non-member requests a private pool's round sheet
- **THEN** the system reveals no private pool, pick, participant, or pot data

### Requirement: Free round submission remains wallet independent
Submitting a round sheet SHALL save valid free predictions through the existing prediction rules before any wager operation. A user MUST be able to submit free picks without discovering, connecting, linking, or signing with a wallet, and wallet/RPC/program failure MUST NOT undo a successful free save.

#### Scenario: Free-only submission
- **WHEN** a member completes available picks and submits with the wager switch off
- **THEN** the predictions are saved
- **AND** no wallet API, Solana RPC, or program call runs

#### Scenario: Wager preparation fails after free save
- **WHEN** free picks save successfully but wallet linking or wager preparation fails
- **THEN** the free picks remain saved and editable under normal kickoff rules
- **AND** the UI reports the free and wager outcomes separately

### Requirement: Wager participation is explicit per pool and round
The wager control SHALL be absent or disabled unless the pool owner has enabled matchday wagers and the round is eligible. Where available, it SHALL be off by default for every user and round; prior participation MUST NOT opt a user into a later round.

#### Scenario: Pool wagering is disabled
- **WHEN** a member opens a round in a pool without enabled wagering
- **THEN** the free round sheet works normally and cannot initiate a wager

#### Scenario: User wagered last round
- **WHEN** the same member opens the next eligible round
- **THEN** the wager switch is off until the member explicitly enables it

### Requirement: Signing requires completeness and informed review
Before creating a wager intent, the system MUST require every eligible round fixture to have a valid prediction, a linked wallet, a still-open round, current eligibility, and explicit acceptance of the displayed terms. Before signature, the system SHALL show token, fixed stake in display and base units, Devnet cluster, linked wallet, confirmed pot and participant count, estimated network fee, exact close, oracle trust, rules, and that signing moves tokens.

#### Scenario: Pick is missing
- **WHEN** a member enables wagering while an eligible fixture lacks a prediction
- **THEN** wager preparation is rejected with the missing fixture identified
- **AND** no transaction is built

#### Scenario: User reviews transfer
- **WHEN** all prerequisites pass
- **THEN** the final review identifies the approved token, amount, wallet, Devnet, fee estimate, close, and irreversible transfer effect before requesting a signature

### Requirement: Immutable wager picks are explained distinctly
The round sheet and receipt SHALL explain that a wager uses an immutable snapshot while free predictions for not-yet-started fixtures remain editable and no later edit changes the wager commitment.

#### Scenario: Free pick changes after entry
- **WHEN** a confirmed entrant edits a free prediction for a later fixture
- **THEN** the free prediction reflects the edit
- **AND** the displayed wager snapshot and commitment remain unchanged

### Requirement: Transaction state is truthful and durable
The UI SHALL distinguish `preparing`, `awaiting_signature`, `submitted`, `confirmed`, `failed`, and reconciliation-pending states. It MUST NOT call an entry confirmed until server-side chain verification succeeds, and it SHALL retain the signature and correct Devnet explorer link once available.

#### Scenario: Wallet submits but verification is delayed
- **WHEN** a signature exists but RPC verification has not completed
- **THEN** the UI shows submitted or reconciliation pending rather than confirmed

#### Scenario: Entry becomes verified
- **WHEN** the server validates the transaction and expected Entry account
- **THEN** the UI shows confirmed with the persisted signature and Devnet explorer link

### Requirement: Matchday wager UI is accessible and localized
All member-facing round, wager, claim, refund, error, and status content SHALL exist in English, Spanish, French, and German. Controls and dialogs SHALL support keyboard use, visible focus, programmatic labels, appropriate live announcements, sufficient contrast, reduced motion, and responsive layouts.

#### Scenario: Wallet error with assistive technology
- **WHEN** a keyboard or screen-reader user encounters a rejected signature
- **THEN** focus and an accessible status message identify the failure and recovery action

#### Scenario: Supported locale
- **WHEN** the round sheet is opened under any supported locale
- **THEN** all new labels, consent text, statuses, and errors render in that locale

