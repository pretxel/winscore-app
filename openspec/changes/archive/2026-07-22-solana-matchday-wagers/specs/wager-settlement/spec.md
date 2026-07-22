## ADDED Requirements

### Requirement: Settlement waits for complete stable results
A wager round SHALL be settlement-eligible only after it is locked, every eligible assigned match is `final` or `cancelled`, each final match has both scores, and a configurable correction period has elapsed since the latest relevant result mutation. A result correction before settlement MUST invalidate and recompute the candidate settlement.

#### Scenario: One match remains live
- **WHEN** any eligible round match is not final or cancelled
- **THEN** the settlement operation is rejected

#### Scenario: Result changes during safety window
- **WHEN** a final score is corrected before the correction period ends
- **THEN** scoring and the candidate manifest are recomputed from the corrected result
- **AND** no earlier candidate is submitted on-chain

### Requirement: Wager scoring uses canonical rules and immutable snapshots
For each final scoreable match, settlement SHALL score only `wager_entry_predictions` using the shared canonical scoring primitive: 5 base points for exact score; 3 for correct outcome and exact goal difference; 1 for correct outcome; and 0 otherwise. It SHALL multiply base points by the stage `pointMultiplier` from `competitions.format_config.stages[]`, using the existing fallback when absent. Cancelled matches SHALL contribute no points.

#### Scenario: Weighted exact snapshot
- **WHEN** an immutable 2-1 pick matches a 2-1 final in a stage with multiplier 4
- **THEN** the wager breakdown records 20 points and an exact hit

#### Scenario: Live prediction differs from snapshot
- **WHEN** a user's mutable prediction differs from the immutable wager snapshot
- **THEN** settlement scores the snapshot only

### Requirement: Wager ranking mirrors canonical pool tie-breaks
Within a pool and round, confirmed entries SHALL rank by total weighted points descending, exact-hit count descending, winner-plus-goal-difference-hit count descending, and minimum snapshotted source `submitted_at` ascending. The system SHALL use rank semantics so entrants equal on every key retain the same rank; winner-hit count SHALL NOT add an unapproved tie-break.

#### Scenario: Exact hits break a points tie
- **WHEN** two entrants have equal points but one has more exact hits
- **THEN** the entrant with more exact hits ranks higher

#### Scenario: Complete tie remains shared rank one
- **WHEN** multiple entrants are equal on points, exact hits, winner-GD hits, and earliest source submission
- **THEN** each entrant has rank 1 and shares the pot

### Requirement: The entire integer pot is allocated deterministically
Only verified confirmed deposits SHALL count in the pot. With pot `P` and `N` rank-1 winners, each winner SHALL receive `floor(P/N)` base units and the remainder SHALL assign one additional unit to winner public keys in ascending raw 32-byte order until exhausted. Awards MUST sum exactly to `P`, with no platform fee or floating-point calculation.

#### Scenario: Pot divides evenly
- **WHEN** a 300-base-unit pot has three winners
- **THEN** each winner receives 100 base units

#### Scenario: Pot has residue
- **WHEN** a 10-base-unit pot has three winners
- **THEN** all receive at least 3 units
- **AND** the raw-byte-smallest winner receives the remaining unit
- **AND** awards total 10

### Requirement: Settlement produces a canonical auditable manifest
The system SHALL create a versioned deterministic manifest containing pool/round identity, eligible fixtures and final/cancelled results, confirmed participants, pick commitments, score/tie breakdowns, winner ordering, integer awards, and relevant program/configuration versions. It MUST persist immutable canonical bytes and SHA-256 and submit that hash on-chain.

#### Scenario: Same evidence is rebuilt
- **WHEN** settlement is recomputed from identical immutable inputs
- **THEN** it produces byte-identical manifest content and hash

#### Scenario: Evidence changes
- **WHEN** any result, commitment, tie key, winner, or award changes before settlement
- **THEN** the manifest hash changes

### Requirement: Claims are bound to a versioned Merkle root
The settlement SHALL construct one domain-separated Merkle leaf per winner binding the program/version, wager-round PDA, winner wallet bytes, and `u64` award. The TypeScript builder and Rust verifier MUST share published test vectors for leaf encoding, sibling ordering, and root calculation.

#### Scenario: Published winner proof
- **WHEN** a winner uses the proof published for their wallet and amount
- **THEN** the proof resolves to the root stored on-chain

#### Scenario: Amount is altered by one unit
- **WHEN** a proof is submitted with a different award
- **THEN** it does not resolve to the stored root

### Requirement: Cancellation and refund cover non-scoreable or timed-out rounds
A locked wager round SHALL become refundable when it is administratively cancelled, has no scoreable match, or passes its safety timeout without settlement. Each confirmed entrant SHALL be able to pull exactly one stake refund, and no entry SHALL both claim a prize and receive a refund.

#### Scenario: Every fixture is cancelled
- **WHEN** a locked round has confirmed deposits but no scoreable match
- **THEN** it is cancelled rather than settled with winners
- **AND** every confirmed entrant can request one exact-stake refund

#### Scenario: Settlement timeout
- **WHEN** the immutable timeout passes without settlement
- **THEN** refund activation does not depend on an arbitrary administrative withdrawal

### Requirement: Settlement evidence and outcomes are visible
Members SHALL be able to inspect the round scoring table, tie-break values, wager-participant marker, award/claim/refund state, manifest hash, transaction signature, correct explorer link, and an explicit statement that Winscore is the authorized sports-results oracle.

#### Scenario: Settled round viewed by a member
- **WHEN** a pool member opens a settled wager round
- **THEN** the UI exposes auditable score and settlement evidence without exposing secrets or pre-disclosure private picks

#### Scenario: Result correction occurs after settlement
- **WHEN** an imported result changes after on-chain settlement
- **THEN** the system preserves the original immutable settlement and raises an incident
- **AND** does not claim that the chain was edited

### Requirement: Settlement data is access controlled and immutable
Settlement, claim, and refund tables SHALL enforce unique chain identities, integer ranges, valid state transitions, RLS, append-only or privileged-only evidence updates, fixed-search-path functions, revoked default privileges, and explicit grants.

#### Scenario: User forges a claim record
- **WHEN** an authenticated user directly attempts to insert or update a claim as paid
- **THEN** RLS or function privileges reject the mutation

