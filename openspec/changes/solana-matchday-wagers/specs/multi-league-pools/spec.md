## ADDED Requirements

### Requirement: Pool owners can optionally configure matchday wagers
An owner SHALL be able to enable matchday wagers for an existing league-scoped pool or during pool creation, and the option SHALL be disabled by default. The configuration SHALL use exactly the deployment-approved token and a fixed integer-base-unit stake, MUST be authorized server-side, and MUST NOT change the pool's `competition_id`, membership, free standings, or join behavior.

#### Scenario: Owner creates a free-only pool
- **WHEN** an owner creates a pool without enabling matchday wagers
- **THEN** the pool is created with normal free behavior and no active wager configuration

#### Scenario: Owner enables wagering
- **WHEN** an owner selects the approved token display and a valid fixed stake within configured limits
- **THEN** the pool records an enabled configuration scoped to that pool and league
- **AND** members may still participate without wagering

#### Scenario: Member attempts configuration
- **WHEN** a non-owner directly invokes the wager configuration mutation
- **THEN** the server and database reject the change

### Requirement: Configuration changes do not rewrite initialized rounds
Pool wager configuration changes SHALL apply only to wager rounds that have not been initialized. An initialized round MUST retain its snapshotted mint, token program, decimals, stake, cluster, close, and program version; disabling future wagers MUST preserve claims and refunds for existing rounds.

#### Scenario: Stake changes between rounds
- **WHEN** an owner changes the fixed stake after one wager round is initialized
- **THEN** the initialized round keeps its original stake
- **AND** a later round uses the new validated stake

#### Scenario: Owner disables wagering with funds outstanding
- **WHEN** an owner disables new matchday wagers
- **THEN** new rounds cannot initialize from that configuration
- **AND** existing entrants retain settlement, claim, or refund access

### Requirement: Wager aggregates remain pool-and-league scoped
Wager rounds, participants, pots, standings, and settlement data SHALL be keyed by the existing pool plus explicit competition round and MUST include only pool members and matches from the pool's `competition_id`.

#### Scenario: Same user belongs to pools in two leagues
- **WHEN** the user views a wager round in one pool
- **THEN** no entry, fixture, pot, or result from the other league contributes

