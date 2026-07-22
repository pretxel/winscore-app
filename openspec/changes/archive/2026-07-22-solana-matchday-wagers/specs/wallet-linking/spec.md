## ADDED Requirements

### Requirement: Supabase Auth remains the account authority
A connected or linked wallet SHALL NOT create, replace, or authenticate a Winscore session. Every challenge and link mutation MUST begin from a validated Supabase Auth user and MUST bind the resulting wallet link to that user.

#### Scenario: Wallet connected without a session
- **WHEN** a browser has a connected Solana wallet but no valid Winscore session
- **THEN** it cannot issue or verify a wallet-link challenge

### Requirement: Wallet-link challenges are exact, scoped, and single use
An authenticated server endpoint SHALL issue a cryptographically random, short-lived challenge containing a protocol version, human-readable purpose, application domain, user ID, wallet public key, cluster, issued-at, expiry, and nonce. The server MUST persist sufficient structured data or a digest to reconstruct and verify exact UTF-8 bytes, and a nonce MUST be consumed atomically at most once.

#### Scenario: Fresh challenge is issued
- **WHEN** an authenticated user requests a challenge for a Devnet wallet
- **THEN** the challenge binds that user, wallet, domain, Devnet, issuance time, expiry, and a random unused nonce

#### Scenario: Nonce replay
- **WHEN** a previously verified nonce is submitted again
- **THEN** verification fails and no link changes

### Requirement: Server verifies proof of control
The server MUST verify the exact signed message bytes and Ed25519 signature against the requested wallet public key, then revalidate nonce, expiry, domain, cluster, user, and session before consuming the challenge and creating a link.

#### Scenario: Valid signature
- **WHEN** the bound wallet signs the exact unexpired challenge and the same authenticated user submits it
- **THEN** the challenge is consumed and the wallet link is stored

#### Scenario: Altered message
- **WHEN** any field or byte of the signed challenge differs from the server reconstruction
- **THEN** verification fails and the nonce remains unusable for a different message

#### Scenario: Expired challenge
- **WHEN** a correctly signed challenge is submitted after expiry
- **THEN** verification fails and no wallet link is created

### Requirement: Active wallet ownership is unique
A canonical wallet address SHALL be linked to at most one active Winscore user. Link creation MUST resolve uniqueness atomically and MUST NOT rely on user-editable profile or JWT metadata for authorization.

#### Scenario: Address already belongs to another account
- **WHEN** a second active user proves control of an address already actively linked
- **THEN** link creation is rejected without disclosing unnecessary account information

### Requirement: Unlinking preserves pending operations
An authenticated user SHALL be able to unlink their own wallet only when no pending wager intent, confirmed unsettled entry, unclaimed award, refundable entry, or reconciliation item depends on it.

#### Scenario: No dependent operation
- **WHEN** a user requests unlinking and no operation depends on the wallet
- **THEN** the active link is ended and the audit timestamp is retained

#### Scenario: Refund remains available
- **WHEN** an entry using the wallet is awaiting refund
- **THEN** unlinking is rejected with a non-sensitive explanation

### Requirement: Wallet secrets and signed payloads are minimized
The system MUST never request, transmit, store, or log seed phrases or private keys. Public keys, signatures, nonces, and messages SHALL use canonical representations; full signed messages/signatures SHALL not be logged unless strictly necessary and explicitly redacted/retained.

#### Scenario: Challenge verification is logged
- **WHEN** verification succeeds or fails
- **THEN** the structured audit event contains outcome and safe identifiers
- **AND** excludes seed material and the complete signed payload

