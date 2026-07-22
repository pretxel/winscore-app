## ADDED Requirements

### Requirement: Competitions have stable explicit rounds
The system SHALL persist competition rounds independently of presentation dates. Each round SHALL belong to exactly one competition and SHALL have a stable `round_key`, localized label or round number, display order, lifecycle status, opening time, optional administrative close, and audit timestamps. The pair `(competition_id, round_key)` MUST be unique.

#### Scenario: Same key in one competition is rejected
- **WHEN** an administrator attempts to create two rounds with the same `round_key` in one competition
- **THEN** the database rejects the duplicate

#### Scenario: Same key across competitions is allowed
- **WHEN** two competitions each define a round with `round_key = '1'`
- **THEN** both rounds are accepted and remain distinct

### Requirement: Fixtures are assigned explicitly and consistently
Each match SHALL reference at most one persisted round, and a match and its round MUST have the same `competition_id`. Wager-eligible matches MUST have a reviewed round assignment; the system MUST NOT derive that assignment solely from kickoff date, ISO week, or temporal proximity.

#### Scenario: Cross-competition assignment is rejected
- **WHEN** an administrator assigns a Liga MX match to a La Liga round
- **THEN** the database rejects the assignment

#### Scenario: Unassigned fixture is not wager eligible
- **WHEN** a fixture has no reviewed round assignment
- **THEN** it may remain available under existing free per-match behavior
- **AND** it is excluded from round wager initialization

### Requirement: Round close is server authoritative
For a round with eligible non-cancelled matches, the effective close SHALL be the earlier of its administrative close and the earliest `kickoff_at`; when no administrative close exists, it SHALL be the earliest `kickoff_at`. Eligibility checks MUST use database and on-chain clocks, not a client clock.

#### Scenario: Administrative close is earlier
- **WHEN** the administrative close precedes every active fixture kickoff
- **THEN** the effective close equals the administrative close

#### Scenario: Earliest kickoff is earlier
- **WHEN** a fixture kickoff precedes the administrative close
- **THEN** the effective close equals that kickoff

#### Scenario: No eligible fixtures remain
- **WHEN** a round has no assigned non-cancelled fixture
- **THEN** the system rejects wager initialization or entry for that round

### Requirement: Kickoff corrections fail conservatively
After a wager round is initialized, an earlier effective close MUST shorten the on-chain close, while a later kickoff MUST NOT extend it. A material fixture-assignment change after deposits MUST cause cancellation and refund rather than silently changing the wagered fixture set.

#### Scenario: Provider moves kickoff earlier
- **WHEN** synchronization moves the earliest kickoff earlier for an initialized open wager round
- **THEN** the application schedules the on-chain close-shortening transition
- **AND** no new entry is accepted at or after the earlier time

#### Scenario: Assigned fixture changes after deposits
- **WHEN** an administrator must replace or remove a fixture after confirmed entries exist
- **THEN** the wager round enters cancellation/refund handling instead of being rescored over a different fixture set

### Requirement: Provider round synchronization is reviewable
Fixture synchronizers SHALL preserve a reliable provider round identifier when available and SHALL mark absent, conflicting, or changed identifiers for administrative review. Automated synchronization MUST NOT guess a round from dates.

#### Scenario: Reliable provider round maps cleanly
- **WHEN** a provider fixture carries a known stable round key
- **THEN** synchronization preserves or assigns the corresponding competition round

#### Scenario: Provider data conflicts
- **WHEN** two provider observations disagree about a fixture's round
- **THEN** synchronization leaves an auditable review item
- **AND** does not overwrite a reviewed assignment silently

### Requirement: Administrators can manage and audit rounds
Authorized administrators SHALL be able to create, edit, assign, validate, and review rounds and fixture assignments. Every sensitive correction MUST be authorized server-side and recorded with actor, timestamp, before/after values, and reason.

#### Scenario: Authorized assignment correction
- **WHEN** an authorized administrator corrects a pre-deposit round assignment with a reason
- **THEN** the new assignment is stored and the audit record preserves the previous value

#### Scenario: Hidden button is bypassed
- **WHEN** a non-administrator directly invokes a round mutation endpoint
- **THEN** server authorization rejects the mutation

### Requirement: Round queries are indexed and access controlled
Round and assignment storage SHALL support indexed competition, status, close, provider-review, and dashboard queries. All exposed round tables SHALL have RLS; public/member reads and administrator mutations SHALL follow the existing competition and pool authorization model.

#### Scenario: Pool member reads relevant rounds
- **WHEN** a member opens a pool dashboard
- **THEN** the member can read rounds belonging to that pool's competition
- **AND** cannot mutate round administration fields

