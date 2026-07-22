## Why

Winscore needs an optional, round-scoped wagering mode that can add a shared Solana prize pool to a private prediction pool without making wallets or blockchain reliability prerequisites for ordinary play. The change must establish explicit competition rounds and auditable, non-custodial settlement before any value-bearing flow is exposed, because the current match-scoped prediction model has neither a stable matchday identity nor the custody, replay, and immutable-pick guarantees a wager requires.

## What Changes

- Add stable competition rounds, explicit match-to-round assignment, provider-sync review, and administration for round lifecycle and deadlines; never infer a round from calendar dates alone.
- Add an owner-controlled, default-off “matchday wagers” configuration to the existing league-scoped `groups` pools, limited to one deployment-approved SPL mint and fixed stake per round.
- Add a round prediction sheet that saves free predictions first and works fully without a wallet; wagering remains an explicit, default-off choice for each pool and round.
- Snapshot a wager entrant’s complete round picks immutably, canonicalize them, and commit their SHA-256 digest on-chain while leaving the original free predictions editable under existing kickoff rules.
- Add authenticated wallet challenge-response linking that proves address control without replacing Supabase Auth or exposing keys, seed phrases, or privileged credentials.
- Add a versioned Solana Devnet escrow program with deterministic PDAs and checked transitions for initialize, enter, lock, settle, claim, cancel/refund, and close; no arbitrary administrative withdrawal or platform fee is introduced.
- Add a durable, idempotent Postgres/Solana saga with trusted transaction construction, RPC verification, reconciliation, event ledger, retry handling, and truthful transaction states.
- Extract a canonical SQL scoring primitive shared by normal score computation and wager settlement, keep the TypeScript replica in contract parity, and deterministically split 100% of the pot among all rank-1 winners.
- Add deterministic settlement manifests and verifiable pull claims/refunds, including an explicit off-chain sports-oracle trust model and a safety delay for result corrections.
- Add feature gates, Devnet/Mainnet safeguards, eligibility hooks, rate/stake limits, audit/observability surfaces, operational runbooks, and blocking Mainnet-readiness criteria.
- Localize all new member and administrator surfaces in English, Spanish, French, and German and cover accessibility, responsive behavior, RLS, program invariants, saga failures, and free-path regressions with tests.

No existing pool, prediction, or free scoring behavior is removed, and there is no intended breaking API or data migration.

## Capabilities

### New Capabilities

- `competition-rounds`: Stable round records, explicit fixture assignment, deadlines/statuses, provider synchronization review, and administrative management.
- `matchday-picks`: A pool-and-round prediction sheet that submits complete free picks and presents wagering as an independent, default-off enhancement.
- `wallet-linking`: Authenticated, replay-safe challenge-response ownership proof and lifecycle rules for a user’s Solana wallet links.
- `solana-wager-custody`: The versioned Devnet escrow program, PDA/account model, instruction authorization, accounting invariants, and Mainnet lockout.
- `wager-entry-saga`: Immutable pick commitments, durable entry intents, transaction construction/verification, idempotency, and Postgres/on-chain reconciliation.
- `wager-settlement`: Round scoring from immutable snapshots, deterministic rankings and pot allocation, manifests/Merkle claims, settlement, claims, cancellation, and refunds.
- `wager-operations`: Feature flags, eligibility/compliance hooks, observability, administration, incident handling, and release gates for a regulated value-bearing feature.

### Modified Capabilities

- `multi-league-pools`: Existing league-scoped pools gain optional owner-managed wagering configuration without changing free membership or standings.
- `predictions`: Users may submit a complete round sheet while preserving the existing per-match uniqueness, ownership, and kickoff locking semantics; wagering snapshots do not mutate or replace free predictions.
- `scoring`: Normal and wager scoring share one canonical SQL primitive and TypeScript contract, while wager rankings apply the pool’s current canonical tie-break semantics to immutable round snapshots.

## Impact

- **Database:** Additive Supabase migrations for rounds, pool wager configuration, wallet challenges/links, intents, entries and immutable picks, settlements, claims, and a chain-event/reconciliation ledger; new constraints, indexes, RLS policies, hardened functions, and regenerated database types.
- **Application:** New league/pool/round routes and Server Components, small wallet/signing Client Components, authenticated Server Actions for user mutations, and Route Handlers/workers for externally driven callbacks and reconciliation. SDK clients and environment-dependent integrations remain lazily initialized.
- **Scoring and sync:** Existing `compute_match_scores`, group leaderboard tie behavior, fixture importers, and `lib/scoring.ts` are refactored or extended with contract tests rather than duplicated.
- **Blockchain:** A new Solana program/IDL and local-validator/Devnet workflow; the application uses the current official Solana frontend stack, Wallet Standard, checked SPL transfers, integer base units, a dedicated RPC provider, and external/multisig authority design.
- **UX and i18n:** Pool creation/settings, matchday board, transaction receipt/timeline, wager table, claim/refund actions, and read-only operations views change across all four locale catalogs while retaining existing semantic tokens and shadcn primitives.
- **Operations and security:** New public/private environment variables, feature and kill switches, server-side authorization and rate limits, structured metrics/logs, reconciliation schedules, legal/territory integration points, security documentation, threat model, rollback plan, and Mainnet blockers.
- **Dependencies and delivery:** Solana/Ed25519/Merkle dependencies and program toolchain versions must be verified against official documentation at implementation time. Work ships incrementally on Devnet; remote Supabase changes and any Mainnet activation remain out of scope without explicit authorization.
