## 1. Safety Gates and Toolchain Baseline

- [x] 1.1 Re-read `AGENTS.md` and the installed Next.js 16.2 guides for Server Actions, Route Handlers, forms, authentication, caching, and Server/Client Components before application edits.
- [x] 1.2 Verify current official Solana frontend, token, cluster, PDA, program, and Anchor guidance; document the reviewed URLs and date.
- [x] 1.3 Check `supabase --help`, migration/test/type-generation commands, local stack health, and current CLI version without touching the remote project.
- [x] 1.4 Run a Solana/Anchor compatibility spike, install missing CLIs, pin exact Rust/Solana/Anchor versions, and prove a minimal local-validator program test.
- [x] 1.5 Resolve and pin a compatible `@solana/kit`, `@solana/react`, Wallet Standard plugin, token-program, Ed25519, canonical-JSON, and Merkle dependency set; record why each dependency is needed.
- [x] 1.6 Define the approved classic SPL Devnet test mint, validate its owner/decimals/authorities on-chain, and record the program ID/cluster without adding Mainnet fallbacks.
- [x] 1.7 Resolve Devnet policy constants for challenge expiry, correction delay, settlement timeout, stake/participant/rate limits, confirmation commitment, RPC provider, and test eligibility hooks.
- [x] 1.8 Add an implementation decision record for external settlement/upgrade signer handling and keep Mainnet blocked until multisig, legal, and audit decisions exist.

## 2. Explicit Competition Rounds

- [x] 2.1 Generate an additive Supabase migration with the discovered CLI command for `competition_rounds`, localized labels, lifecycle/provider-review fields, uniqueness, checks, audit timestamps, and query indexes.
- [x] 2.2 Add nullable `matches.round_id` plus composite competition-consistency keys/indexes and validate that cross-competition assignments fail.
- [x] 2.3 Implement hardened SQL helpers for eligible round fixtures and effective close using the database clock, cancelled-fixture exclusion, and optional earlier administrative close.
- [x] 2.4 Add RLS and least-privilege grants for round reads and administrator mutations, including fixed-search-path privileged functions and adversarial SQL tests.
- [x] 2.5 Build explicit trusted backfill data for known provider rounds and leave ambiguous fixtures unassigned/reviewable without date or ISO-week inference.
- [x] 2.6 Extend football-data and ESPN sync types/adapters to preserve reliable provider round keys and create conflicts/review states without overwriting reviewed assignments.
- [x] 2.7 Add unit/integration tests for mapped, absent, conflicting, changed, postponed, cross-midnight, and cross-competition provider round data.
- [x] 2.8 Build administrator Server Components and authorized actions for round creation/editing, fixture assignment, completeness review, and audited corrections.
- [x] 2.9 Add localized admin round/review states in `en`, `es`, `fr`, and `de`, with keyboard, focus, loading, empty, and error coverage.
- [x] 2.10 Add the close-shortening/cancellation trigger or queued operation when synchronization moves kickoff earlier or changes the wagered fixture set after initialization.

## 3. Free Matchday Prediction Sheet

- [x] 3.1 Add server data loaders for one pool-and-round sheet with membership enforcement, league scope, ordered fixtures, current predictions, completeness, and local-time close display.
- [x] 3.2 Implement a validated bulk free-prediction Server Action that preserves existing per-match uniqueness, score bounds, ownership, and database kickoff locks.
- [x] 3.3 Define and test partial/locked response semantics so an incomplete or raced free submission cannot proceed to wager preparation.
- [x] 3.4 Build the responsive matchday-board sheet using existing semantic tokens and shadcn primitives, keeping fixture entry primary and avoiding a page-wide Client Component.
- [x] 3.5 Add a default-off wager rail placeholder that loads no wallet/RPC code when pool wagering is unavailable or not selected.
- [x] 3.6 Add tests proving free-only submission performs no wallet/RPC/program operation and remains saved through every simulated wager failure.
- [x] 3.7 Add matchday-sheet copy and validation/errors in all four locale catalogs and verify keyboard navigation, labels, live announcements, contrast, focus, and reduced motion.

## 4. Canonical Scoring and Ranking

- [x] 4.1 Generate a migration for a pure canonical SQL prediction-scoring primitive and a separate canonical stage-multiplier resolver with the current configured/fallback behavior.
- [x] 4.2 Refactor `public.compute_match_scores` to call the shared primitives without changing `scores` output or idempotent result-update behavior.
- [x] 4.3 Update `lib/scoring.ts` only as needed to mirror the final SQL primitive and multiplier contract with strict types.
- [x] 4.4 Add generated SQL/TypeScript contract tests covering 5/3/1/0 outcomes, draws, goal bounds, configured/fallback/unknown stages, and multiplier boundaries.
- [x] 4.5 Implement and test round snapshot aggregation using points, exact hits, winner-GD hits, and minimum source `submitted_at`, with SQL `rank()` tie semantics and no extra winner-hit tie-break.
- [x] 4.6 Implement integer pot allocation with raw public-key byte ordering for residue and property tests proving non-negative awards sum exactly to the pot.
- [x] 4.7 Run existing scoring, result-sync, leaderboard, join-date, stage-weighting, and league-isolation regressions before proceeding.

## 5. Wager Database, Constraints, and RLS

- [x] 5.1 Generate additive migrations for `group_wager_configs` and immutable `wager_rounds` snapshots with approved asset, `numeric(20,0)` u64 checks, cluster/version, close, authority, state, and indexes.
- [x] 5.2 Generate additive migrations for `wallet_link_challenges`, `wallet_links`, `wager_intents`, `wager_entries`, `wager_entry_predictions`, `wager_settlements`, `wager_claims`, and append-only `wager_chain_events`.
- [x] 5.3 Store public keys/hashes/signatures in canonical checked byte columns and add foreign keys/unique indexes for active wallet ownership, intent/idempotency/signature/PDA identity, and one user entry per pool/round.
- [x] 5.4 Implement owner-authorized wager configuration functions that validate pool competition, fixed stake limits, approved mint/program/decimals/Devnet, and immutable initialized-round snapshots.
- [x] 5.5 Implement the atomic snapshot-and-intent function with membership/eligibility/close row locks, complete prediction checks, source timestamps, unique idempotency, and no partial writes.
- [x] 5.6 Implement RFC 8785 pick canonicalization and SHA-256 commitment helpers with versioned cross-runtime fixtures and byte-level tests.
- [x] 5.7 Enable RLS on every exposed table and add minimal owner/member/self/operator policies, `security_invoker` views, fixed-search-path functions, revoked defaults, and explicit grants.
- [x] 5.8 Add SQL tests for cross-user/pool/league reads, forged owner/member writes, snapshot immutability, close races, replay/uniqueness, u64 bounds, and view/function privilege behavior.
- [x] 5.9 Run local migrations/advisors, fix security/performance findings, regenerate `lib/database.types.ts`, and remove any casts that conceal stale schema types.

## 6. Secure Wallet Linking

- [x] 6.1 Implement a server-only versioned challenge formatter with exact UTF-8 bytes, cryptographic nonce, domain/user/wallet/Devnet binding, issued-at, expiry, and safe persistence.
- [x] 6.2 Add authenticated uncached Route Handlers for challenge issuance and verification with rate limits and fresh session checks.
- [x] 6.3 Verify Ed25519 signatures, exact message reconstruction, expiry, domain, cluster, user, and wallet before atomically consuming a nonce and creating the unique active link.
- [x] 6.4 Implement unlinking with server authorization and dependency checks for pending intents, unsettled entries, claims, refunds, and reconciliation.
- [x] 6.5 Build a small Wallet Standard Client Component for wallet discovery, exact-message signing, linked state, rejection, expiry, and retry without treating connection as authentication.
- [x] 6.6 Add unit, integration, SQL, and E2E tests for valid linking, altered bytes, wrong wallet/user/domain/cluster, expiry, replay races, duplicate ownership, safe unlink, and blocked unlink.
- [x] 6.7 Audit logs and error payloads to ensure no seed phrases, private keys, complete challenge bodies/signatures, or unnecessary personal data are retained.

## 7. Solana Escrow Program

- [x] 7.1 Scaffold the pinned Anchor workspace/program and commit program ID, IDL generation, deterministic seed/version constants, account-size calculations, and local-validator scripts.
- [x] 7.2 Implement `initialize_wager_round` and vault creation with approved Devnet mint/token program/decimals, stake, close, timeout, authorities, limits, versions, accounting totals, and immutable rent recipients.
- [x] 7.3 Implement `enter` with wallet signer, deterministic Entry PDA, intent hash, pick commitment, exact checked SPL transfer, close/limit checks, and checked accounting.
- [x] 7.4 Implement permissionless `lock` and authority-controlled `shorten_close` that can only reduce the pre-settlement close.
- [x] 7.5 Implement one-time `settle` with authority/state checks, manifest hash, Merkle root, winner count, and total-distributable equality without transferring to an administrator.
- [x] 7.6 Implement domain-separated Merkle proof verification and one-time `claim` with deterministic Claim PDA, exact award, recipient checks, and liability accounting.
- [x] 7.7 Implement `cancel_and_refund` for authorized cancellation or permissionless safety timeout plus one-time exact-stake `refund`, mutually exclusive with settlement claims.
- [x] 7.8 Implement terminal `close` only for zero balance/liability and return rent to immutable recorded recipients; confirm no arbitrary withdrawal instruction exists.
- [x] 7.9 Add instruction tests for every authority, owner, seed, mint/program/decimals, stake, close, duplicate/replay, wrong proof/award/recipient, timeout, overflow, limit, and state-transition failure.
- [x] 7.10 Add property/invariant tests proving deposits equal claims plus refunds plus outstanding liability and the program never transfers more than deposited.
- [x] 7.11 Run complete local-validator lifecycle tests for settle/claim and cancel/refund, publish shared Rust/TypeScript Merkle fixtures, and generate a reviewed IDL.
- [ ] 7.12 Deploy only the audited test build to Devnet, record program/version/upgrade/settlement authorities securely, and verify explorer/account identities before application integration.

## 8. Entry Transaction Saga and Reconciliation

- [x] 8.1 Add validated server-only wager environment parsing with Devnet-only cluster, public program/mint fields, private RPC credentials, independent flags, and lazy SDK initialization safe for `next build`.
- [x] 8.2 Implement trusted PDA/address derivation and program instruction codecs from the reviewed IDL with shared golden vectors.
- [x] 8.3 Implement the prepare-entry Server Action/Route Handler that re-reads trusted intent/configuration/round/link state and builds an exact recent-blockhash transaction.
- [x] 8.4 Extend the wallet client island to sign/submit the prepared transaction and persist only the signature/status hint, with explicit rejection, insufficient balance, missing token account, and blockhash-expiry states.
- [x] 8.5 Implement submitted-state persistence that treats client signatures as unverified and enforces allowed durable state transitions.
- [x] 8.6 Implement independent RPC transaction verification for cluster, commitment, execution, program instruction, PDAs, signer, token program, mint, stake, commitment, intent hash, and Entry account contents.
- [x] 8.7 Persist verified `wager_entries`, pot/participant aggregates, and append-only normalized chain events idempotently under locks.
- [x] 8.8 Implement a scheduled reconciler with bounded exponential backoff/jitter for callbacks lost, RPC 429/timeouts, late confirmations, expired/orphaned intents, and Postgres/on-chain mismatches.
- [x] 8.9 Implement safe blockhash-expiry rebuild only after proving the deterministic Entry account is absent; reconcile rather than rebuild when it exists.
- [x] 8.10 Add saga tests for signature rejection, tampered/unrelated signature, dropped transaction, lost callback, RPC outage/rate limit, blockhash expiry, retry, late confirmation, duplicate calls, and existing Entry recovery.

## 9. Pool Configuration and Wager Entry UX

- [x] 9.1 Extend pool creation/settings Server Components and owner-authorized actions with the default-off matchday wager option, approved token display, fixed stake, limits, and no free-flow regression.
- [x] 9.2 Initialize wager rounds from trusted pool/round configuration behind its own flag and expose read-only member-safe pot/participant/close data.
- [x] 9.3 Complete the wager rail with linked wallet, unmistakable Devnet badge, approved token/stake, confirmed pot/participants, local close, fee estimate, eligibility, oracle/rules, and immutable-snapshot explanation.
- [x] 9.4 Add an explicit final consent/review dialog that states the signature moves tokens and records the accepted rules/risk/oracle version before preparation.
- [x] 9.5 Render durable preparing, awaiting-signature, submitted, confirmed, failed, expired, and reconciliation-pending timelines without optimistic confirmation or balance claims.
- [x] 9.6 Add persisted transaction receipt details, signature, correct Devnet explorer link, commitment identifier, and recovery actions for delayed/failed states.
- [x] 9.7 Cover absent wallet, rejected signature, insufficient token balance, absent token account, expired blockhash, RPC unavailable, failed transaction, delayed confirmation, reached close, and reconciliation pending accessibly.
- [x] 9.8 Add all configuration/entry/receipt/consent/status/error copy to English, Spanish, French, and German and run locale-key parity checks.
- [x] 9.9 Add E2E tests proving one member can wager one round and skip another, free users need no wallet, pools/leagues remain isolated, and direct unauthorized mutations fail.

## 10. Settlement, Claims, and Refunds

- [x] 10.1 Implement settlement-readiness checks for locked state, all final/cancelled fixtures, complete final scores, correction delay, and invalidation on pre-settlement result changes.
- [x] 10.2 Build immutable-snapshot scoring and canonical pool tie ranking using the shared SQL primitive and confirmed entries only.
- [x] 10.3 Implement deterministic integer pot allocation and versioned RFC 8785 settlement manifest generation with complete fixture/result/commitment/score/tie/winner evidence.
- [x] 10.4 Persist immutable manifest canonical bytes/hash and build the domain-separated Merkle tree/proofs from the shared encoding test vectors.
- [x] 10.5 Implement authorized settlement transaction construction/submission/verification and idempotent Postgres reconciliation behind the settlement flag and correction delay.
- [x] 10.6 Implement member claim preparation, Wallet Standard signing, on-chain verification, durable claim state, replay prevention, and correct receipt/explorer data.
- [x] 10.7 Implement cancellation/refund activation for admin cancellation, no scoreable fixtures, assignment change, or safety timeout, plus member pull-refund signing and verification.
- [x] 10.8 Build the round wager table showing points, canonical tie-breaks, wager participants, winners/awards, claim/refund states, manifest/signature evidence, and explicit oracle trust.
- [x] 10.9 Add incident behavior for post-settlement result correction that preserves immutable evidence, raises an alert, and does not attempt an on-chain edit.
- [x] 10.10 Add integration/E2E tests for multi-winner ties, rounding residue byte order, zero scoreable matches, delayed correction, settlement replay, valid/invalid/double claim, refund, and claim/refund exclusion.

## 11. Feature Controls, Observability, and Operations

- [x] 11.1 Implement independent server-enforced flags for UI, initialization, deposits, and settlement plus a deposit kill switch that never blocks claims/refunds.
- [x] 11.2 Implement fail-closed Devnet configuration validation and automated tests proving Mainnet cluster/mint/program values cannot enable MVP value movement.
- [x] 11.3 Implement server-side eligibility interfaces for age, jurisdiction/geofencing, self-exclusion, stake/participation limits, and versioned acceptance with explicit Devnet placeholders.
- [x] 11.4 Add server rate limits and program limits for challenges, intents, initialization, entry, settlement, claim, and refund paths.
- [x] 11.5 Add structured logs/metrics correlated by safe intent/signature/pool/round identifiers for every required state, RPC latency/error, mismatch, terminal round, claim/refund, and aged liability.
- [x] 11.6 Build an authorized read-only reconciliation/alert dashboard with separate reauthenticated, audited corrective operations.
- [x] 11.7 Verify all privileged routes/actions/functions reauthenticate and authorize on the server and no service-role, RPC secret, or authority private key reaches browser bundles/logs.
- [x] 11.8 Write runbooks for RPC outage, orphan/late transactions, blockhash expiry, fixture correction/reassignment, cancellation, result correction, delayed settlement, authority compromise, emergency pause, Devnet reset, and unclaimed funds.
- [x] 11.9 Update architecture, data model, environment, security/trust, deployment, program/IDL, reconciliation, and operator documentation with the explicit no-Mainnet/no-legal-approval position.

## 12. Final Verification and Controlled Devnet Rollout

- [x] 12.1 Run all unit and generated contract tests for scoring, multipliers, aggregation, tie ranks, commitments, Merkle proofs, and pot conservation.
- [x] 12.2 Run the complete local Supabase migration, SQL/RLS, race/replay, policy, advisor, and generated-type verification suite from a clean database.
- [x] 12.3 Run the complete Anchor/program unit, invariant, local-validator, and IDL/client compatibility suite with the pinned toolchain.
- [ ] 12.4 Run Devnet deposit, independent confirmation, callback-loss reconciliation, settlement, claim, cancellation, refund, and close smoke tests with recorded signatures.
- [x] 12.5 Run free-only and wager E2E suites across mobile/desktop, keyboard/assistive states, and `en`, `es`, `fr`, and `de`.
- [x] 12.6 Run all existing regression suites, especially predictions/kickoff locks, scoring/results sync, groups/join dates, and pool/league isolation.
- [x] 12.7 Run and record `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`, explicitly listing any externally blocked verification instead of claiming it passed.
- [ ] 12.8 Review the threat model against implementation, perform dependency/secret/bundle/RLS/program-account audits, and leave deposit/settlement flags off until every blocking finding is closed.
- [ ] 12.9 Exercise rollback and kill-switch drills proving new deposits stop while existing claims/refunds and audit evidence remain accessible.
- [ ] 12.10 Enable only a limited Devnet test cohort after approvals, monitor discrepancies and liabilities, and keep Mainnet structurally blocked for a separate future change.
