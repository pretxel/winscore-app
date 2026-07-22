# solana-wager-custody Specification

## Purpose
TBD - created by archiving change solana-matchday-wagers. Update Purpose after archive.
## Requirements
### Requirement: MVP is Devnet-only with one approved SPL mint
The program and application SHALL accept only the configured Devnet cluster, program ID, mint, token program, and on-chain decimals. Amounts MUST be integer base units represented as `u64`/`bigint`, and deposits MUST use a checked token transfer. The MVP SHALL reject arbitrary user mints, Mainnet, floating-point amounts, and Token-2022 extensions that alter amount or authority semantics.

#### Scenario: Correct approved token
- **WHEN** initialization and entry use the deployment-approved classic SPL mint, token program, decimals, and Devnet program
- **THEN** token validation may proceed

#### Scenario: Wrong mint or decimals
- **WHEN** an instruction supplies a different mint, token program, or decimals
- **THEN** the program rejects it before moving funds

#### Scenario: Mainnet configuration
- **WHEN** the MVP application is configured for Mainnet
- **THEN** startup or value-moving operations fail closed

### Requirement: Wager round escrow is deterministic and fully initialized
`initialize_wager_round` SHALL create one deterministic wager-round PDA and program-controlled token vault for a pool-and-round identity and version. It MUST record the approved asset, exact stake, close, refund timeout, settlement authority, program/manifest version, accounting totals, and immutable rent recipients, and MUST reject inconsistent or duplicate initialization.

#### Scenario: Valid initialization
- **WHEN** authorized initialization supplies the expected seeds and approved immutable configuration
- **THEN** the PDA and vault are created with zero participants, deposits, awards, claims, and refunds

#### Scenario: Seed substitution
- **WHEN** supplied pool, round, version, PDA, or vault seeds do not match
- **THEN** initialization is rejected

### Requirement: Entry deposits exactly once and before close
`enter` SHALL require the entrant wallet signer, a unique deterministic Entry PDA, an unused intent identity, a 32-byte pick commitment, expected approved accounts, and exactly one stake transferred with checked arithmetic. It MUST reject entry at or after the on-chain Clock close.

#### Scenario: First valid entry
- **WHEN** the linked wallet signs a valid entry before close with sufficient approved tokens
- **THEN** exactly the fixed stake enters the vault and the Entry account records wallet, intent, and commitment

#### Scenario: Duplicate entry or replay
- **WHEN** the same wallet, Entry PDA, or intent attempts to enter again
- **THEN** the program rejects the replay and transfers no additional tokens

#### Scenario: Late entry
- **WHEN** the on-chain Clock is at or beyond close
- **THEN** the program rejects entry even if the browser or server clock is behind

### Requirement: Close can only become more restrictive
`lock` SHALL prevent entries once close is reached and MAY be invoked permissionlessly. An authorized `shorten_close` transition MAY only move an unsettled round's close earlier and MUST never extend it.

#### Scenario: Permissionless lock
- **WHEN** any caller invokes lock after the recorded close
- **THEN** the wager round enters locked state without transferring funds

#### Scenario: Attempted extension
- **WHEN** an authority attempts to change close to a later time
- **THEN** the program rejects the change

### Requirement: Settlement is single-use and liability preserving
`settle` SHALL require the recorded settlement authority, locked state, one manifest hash, one claim root, a positive winner count when funds exist, and a total distributable exactly equal to tracked deposits not already refunded. It MUST succeed at most once and MUST NOT transfer tokens to the authority.

#### Scenario: Valid settlement
- **WHEN** the authorized signer settles a locked funded round with matching totals
- **THEN** the program records the immutable manifest hash, claim root, winner count, and distributable amount

#### Scenario: Double settlement or excessive distribution
- **WHEN** settlement is repeated or declares more/less than the refundable deposited pot
- **THEN** the program rejects it and leaves the vault unchanged

### Requirement: Winners claim by verifiable proof once
`claim` SHALL verify the domain-separated Merkle proof, wager round, winner wallet signer/recipient, integer award, settled state, and deterministic Claim PDA. A successful claim MUST reduce outstanding liability exactly once and MUST reject altered awards, proofs, recipients, or replays.

#### Scenario: Valid winner claim
- **WHEN** a winner presents the correct proof and signs for the expected wallet
- **THEN** the exact integer award transfers from the vault and the Claim account prevents another claim

#### Scenario: Invalid or repeated claim
- **WHEN** a caller changes the amount/wallet/proof or reuses a completed Claim PDA
- **THEN** no tokens move

### Requirement: Cancellation enables pull refunds without an admin sweep
`cancel_and_refund` SHALL enter a cancellation state when authorized before settlement or when a caller proves the recorded safety timeout has elapsed. In cancellation, each valid Entry wallet SHALL be able to invoke `refund` once for exactly its stake; claims and refunds MUST be mutually exclusive.

#### Scenario: Cancelled round refund
- **WHEN** an entrant requests refund from a cancelled wager round
- **THEN** exactly one stake returns to the entrant and the entry cannot be refunded again

#### Scenario: Safety timeout
- **WHEN** a locked round remains unsettled beyond its on-chain refund timeout
- **THEN** cancellation can be activated without an arbitrary token withdrawal authority

### Requirement: Program accounting conserves all funds
Every instruction SHALL validate owner/program/mint/seeds/state/authority, use checked arithmetic and explicit limits, and maintain `deposits = claims + refunds + outstanding liability`. The program MUST never transfer more tokens than confirmed deposits and SHALL contain no arbitrary administrative withdrawal instruction.

#### Scenario: Arithmetic boundary or forged account
- **WHEN** an operation would overflow, exceed a configured limit, use a forged account, or violate conservation
- **THEN** the complete instruction fails atomically and no token balance changes

### Requirement: Closing handles tokens and rent explicitly
`close` SHALL be permitted only when token liability and vault balance are zero and all terminal conditions hold. Token accounts and program accounts SHALL return recoverable rent only to immutable original rent recipients or account payers.

#### Scenario: Outstanding liability exists
- **WHEN** any claim or refund liability remains
- **THEN** close is rejected

#### Scenario: Fully drained terminal round
- **WHEN** all token liabilities are satisfied and account close rules pass
- **THEN** accounts may close and recoverable rent goes to the recorded recipients

