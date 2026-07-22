# wager-operations Specification

## Purpose
TBD - created by archiving change solana-matchday-wagers. Update Purpose after archive.
## Requirements
### Requirement: Value-moving capabilities have independent flags
The system SHALL have independently controlled flags for wager UI, wager-round initialization, deposits, and settlement. Disabling initialization or deposits MUST NOT disable claims or refunds for existing funds, and a kill switch SHALL reject new wagers server-side and on-chain where applicable.

#### Scenario: Deposit kill switch activates
- **WHEN** operations disables new deposits during an incident
- **THEN** no new intent transaction or entry is accepted
- **AND** existing eligible claims and refunds remain available

#### Scenario: UI flag is bypassed
- **WHEN** a caller directly invokes a disabled value-moving endpoint
- **THEN** the server rejects it even if the UI is hidden

### Requirement: Mainnet remains a blocking gate
The MVP SHALL default to and accept Devnet only, label Devnet unmistakably, and fail closed for Mainnet configuration. Any future Mainnet activation MUST be a separate reviewed change requiring jurisdictional legal approval, threat-model review, external program audit, economic testing, secure multisig/external authorities, monitoring, upgrade/pause policy, and recovery rehearsal.

#### Scenario: Accidental Mainnet environment value
- **WHEN** a deployment sets cluster or mint configuration to Mainnet values
- **THEN** value-moving initialization fails rather than falling back or proceeding

### Requirement: Eligibility and consent are server enforced
Before wager intent creation, the server SHALL enforce configurable hooks for age, territory/geofencing, self-exclusion, stake/participation limits, and terms/risk/oracle acceptance version. Devnet placeholder policies MUST be explicit and MUST NOT be represented as legal approval.

#### Scenario: Self-excluded user
- **WHEN** an otherwise eligible member is marked self-excluded
- **THEN** wager intent creation is rejected while free predictions remain available

#### Scenario: Terms version changes
- **WHEN** the required rules or risk terms version changes
- **THEN** previous acceptance does not satisfy a new wager until the user accepts the current version

### Requirement: Sensitive operations require real authorization
Round cancellation, close shortening, settlement submission, reconciliation overrides, and feature switches MUST validate role and fresh authorization or reauthentication on the server. Administrative UI visibility alone SHALL NOT grant authority, and privileged keys MUST NOT be stored in source control or public environment variables.

#### Scenario: Stale administrator session
- **WHEN** an administrator attempts a sensitive operation without required fresh authorization
- **THEN** the operation is rejected and requests reauthentication

### Requirement: Structured observability correlates the saga safely
The system SHALL emit structured metrics and audit events correlated by safe forms of wager intent, signature, pool, and round identifiers. It SHALL measure intent creation/expiry, signature rejection, deposits submitted/confirmed/failed, RPC latency/errors, Postgres/on-chain discrepancies, round terminal states, claim/refund outcomes, and aged unclaimed funds without logging private keys, seed phrases, full signed payloads, or unnecessary personal data.

#### Scenario: RPC timeout during verification
- **WHEN** confirmation receives an RPC timeout
- **THEN** a correlated safe error/latency event and reconciliation metric are emitted
- **AND** secrets and complete transaction/challenge payloads are absent

### Requirement: Operators have a read-only reconciliation view
Authorized operators SHALL have a read-only dashboard for intent/entry/chain discrepancies, locked/settled/cancelled rounds, claim/refund failures, RPC health, and aged liabilities. Corrective actions SHALL remain separate, explicitly authorized, audited operations.

#### Scenario: Confirmed Entry missing in Postgres
- **WHEN** reconciliation detects an on-chain Entry without matching confirmed application state
- **THEN** the dashboard raises an actionable discrepancy linked by safe identifiers

### Requirement: Incident runbooks preserve existing liabilities
Documented runbooks SHALL cover RPC outage, orphaned and late transactions, blockhash expiry, cancelled or reassigned rounds, result correction before/after settlement, delayed settlement, compromised authority, emergency pause, Devnet reset, and unclaimed funds. Runbooks MUST prioritize preventing new deposits while preserving claim/refund access and audit evidence.

#### Scenario: Settlement authority is suspected compromised
- **WHEN** operators trigger the compromised-authority runbook
- **THEN** new initialization/deposits/settlement are paused as applicable
- **AND** existing liabilities and evidence are inventoried without an arbitrary sweep

### Requirement: Verification is proportional to custody risk
Before enabling public Devnet deposits, the change MUST pass unit scoring/allocation tests, SQL/TypeScript parity tests, SQL/RLS adversarial and close-race tests, every program instruction/invariant/replay/overflow test, local-validator and Devnet lifecycle integration tests, saga failure/reconciliation tests, free and wager E2E tests, accessibility and four-locale tests, and existing regression suites. Reports MUST distinguish executed checks from externally blocked checks.

#### Scenario: Required program test is not runnable
- **WHEN** the pinned program toolchain or Devnet is unavailable
- **THEN** the report names the unexecuted check and deposits remain disabled
- **AND** it does not claim full verification

#### Scenario: Application release candidate
- **WHEN** the implementation is considered ready
- **THEN** `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` run successfully alongside discovered SQL and Solana test commands

