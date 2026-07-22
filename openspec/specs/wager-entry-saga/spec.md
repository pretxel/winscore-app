# wager-entry-saga Specification

## Purpose
TBD - created by archiving change solana-matchday-wagers. Update Purpose after archive.
## Requirements
### Requirement: Wager entry snapshots complete picks atomically
Before transaction construction, the server SHALL re-read the authenticated user, pool membership, enabled configuration, eligible round fixtures, effective close, wallet link, and predictions in one protected database operation. It MUST reject incomplete or late entries and atomically create immutable `wager_entry_predictions` plus a uniquely keyed `wager_intent`.

#### Scenario: Complete open round
- **WHEN** an eligible member has a valid prediction for every eligible fixture before close
- **THEN** the database creates one immutable snapshot row per fixture and one preparing intent in the same transaction

#### Scenario: Close race
- **WHEN** the database clock reaches close while snapshot creation competes with another request
- **THEN** the operation creates neither a partial snapshot nor an enterable intent

### Requirement: Pick commitment is deterministic and versioned
The system SHALL canonicalize the immutable snapshot with a documented version, identity fields, normalized integer scores/timestamps, and match records sorted by canonical match ID bytes, then compute SHA-256 over the exact UTF-8 canonical bytes. The database, transaction builder, verifier, settlement manifest, and Entry account MUST reference the same 32-byte commitment.

#### Scenario: Same logical snapshot
- **WHEN** the same snapshot is serialized on supported server implementations regardless of object insertion order
- **THEN** the canonical bytes and SHA-256 commitment are identical

#### Scenario: One pick changes
- **WHEN** one home or away score changes before snapshot creation
- **THEN** the commitment changes

### Requirement: Wager snapshots are immutable and separate from free picks
After intent creation, end users SHALL have no update/delete path for snapshot rows. Wager scoring MUST read snapshots rather than live `predictions`, while free predictions retain their normal per-match edit rules.

#### Scenario: Later free edit
- **WHEN** an entrant edits an unlocked live prediction after snapshot creation
- **THEN** the free row changes and the wager snapshot, canonical bytes, and commitment do not

### Requirement: Entry intent state is durable and explicit
`wager_intents` SHALL persist unique user/pool/round/idempotency identity, expiry, wallet, mint, stake, commitment, cluster, program/version, transaction/signature metadata, failure code, and a state among preparing, awaiting signature, submitted, confirmed, failed, expired, or reconciliation required. State transitions MUST be validated and idempotent.

#### Scenario: Signature rejected
- **WHEN** the wallet rejects the signing request
- **THEN** the intent records a non-confirmed failure outcome and no entry is claimed as confirmed

#### Scenario: Callback is lost
- **WHEN** a transaction lands but the browser never calls back
- **THEN** the submitted/expiring intent remains discoverable by reconciliation

### Requirement: Server builds transactions from trusted state
The server SHALL construct the entry transaction from freshly read configuration, round, intent, RPC, blockhash, program, PDA, mint, and stake values. The client SHALL only select/sign/submit through Wallet Standard and MUST NOT be trusted to choose program accounts, mint, amount, commitment, close, or identity.

#### Scenario: Client tampers with amount
- **WHEN** a client requests a transaction with a different stake or destination
- **THEN** the server ignores/rejects the untrusted value and does not build that transaction

### Requirement: Confirmation requires independent chain verification
A client-supplied signature SHALL only move an intent to submitted. Before confirming, the server MUST query the configured cluster and validate successful confirmation, expected program instruction, PDAs, wallet signer, token program, mint, exact stake, commitment, intent identity, and the resulting Entry account contents.

#### Scenario: Unrelated valid signature
- **WHEN** the client submits a successful Devnet signature that does not contain the expected entry instruction
- **THEN** the intent is not confirmed

#### Scenario: Expected transaction and Entry account agree
- **WHEN** RPC proves the expected transaction and derived Entry data
- **THEN** one `wager_entries` row is persisted as confirmed and counted in the pot

### Requirement: Retries cannot double charge
Unique constraints and the Entry PDA SHALL enforce one entry per user/pool/round, unique intent/idempotency/signature identities, and one wallet entry on-chain. Before rebuilding an expired transaction, the server MUST prove the expected Entry account does not already exist; if it exists, it SHALL reconcile rather than transfer again.

#### Scenario: Expired blockhash without entry
- **WHEN** a submitted transaction expired and RPC proves no Entry account exists
- **THEN** the same intent may receive a newly built transaction without creating a second logical intent

#### Scenario: Retry after callback loss
- **WHEN** retry discovers the expected Entry account already exists
- **THEN** it marks/reconciles the original intent and builds no new deposit

### Requirement: Reconciliation converges cross-system state
A retryable reconciler SHALL scan submitted, expired, orphaned, and inconsistent intents/events, query signatures and deterministic accounts, append normalized chain evidence, and converge Postgres to verified on-chain facts with bounded backoff for RPC 429/timeouts.

#### Scenario: RPC temporarily unavailable
- **WHEN** verification receives a timeout or rate limit
- **THEN** the intent becomes or remains reconciliation pending with a bounded retry schedule
- **AND** no duplicate transaction is sent merely because verification failed

#### Scenario: Confirmed chain entry missing in Postgres
- **WHEN** reconciliation finds a valid expected Entry account for an open intent
- **THEN** it idempotently records the entry and confirmed state

### Requirement: Saga storage is private by default
Exposed intent, snapshot, entry, and chain-event tables SHALL use RLS, canonical byte/integer representations, explicit constraints, and least-privilege functions. Users SHALL see only their own sensitive entry data and member-safe pool aggregates; raw RPC payloads and privileged reconciliation controls MUST remain server-only.

#### Scenario: Member queries another private snapshot
- **WHEN** a pool member attempts to read another entrant's immutable picks before disclosure is allowed
- **THEN** RLS returns no snapshot details

