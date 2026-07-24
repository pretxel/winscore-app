# Admin Wager Config — Design

**Date:** 2026-07-24
**Status:** Approved

## Problem

Wagering is fully wired in code (link wallet → intent → prepare → sign → submit,
plus reconciler), but no wager round can be enabled without manual SQL and a CLI
script. Three things must happen per round before a user can bet:

1. `configure_pool_wager` — create the `group_wager_configs` row (approved mint,
   token program, decimals, stake).
2. `initialize_wager_round` (DB) — create the `wager_rounds` row.
3. `initialize_wager_round` (on-chain) — create the round PDA + vault ATA so
   `prepare`'s deposit can succeed.

This design adds a global-admin UI + routes that do all three, so a Winscore
operator can enable a round end-to-end without touching SQL or a shell.

## Audience & placement

Global admin only. Lives under the existing admin area
(`app/[locale]/(admin)/admin/wager/`), gated by `AdminLayout`
(`profiles.is_admin`). The two config RPCs currently require `is_group_owner`;
they are relaxed to `is_group_owner(g) OR is_admin()` so an operator who is not
the pool owner can call them.

RPC calls are made with the admin's **session** client (not the service-role
client), so `auth.uid()` is populated and `is_admin()` inside the RPC returns
true. Each route also verifies `is_admin` in TypeScript before doing anything,
matching the existing admin-action pattern.

## Architecture

- **UI** — `app/[locale]/(admin)/admin/wager/page.tsx` (client component).
  - Group selector (existing groups).
  - Configure form: mint (base58) + stake (human amount, e.g. `1`) →
    "Configure wagering".
  - Round selector (rounds of the chosen group) + "Initialize round
    (DB + on-chain)".
  - Status panel: config present? · `wager_round` row present? · on-chain vault
    present? · explorer link for the init tx.
  - Nav link added to the admin shell.

- **API routes** (server; each re-checks `is_admin`):
  - `POST /api/admin/wager/configure` — body `{ groupId, mint, stakeAmount }`.
    Fetch the mint account on devnet; validate it is a mint; read `decimals`;
    derive the token program from the account owner. Compute
    `stake_base_units = round(stakeAmount * 10^decimals)`. Call
    `configure_pool_wager(group, mint, tokenProgram, decimals, stakeBaseUnits,
    'devnet')` via the session client.
  - `POST /api/admin/wager/initialize` — body `{ groupId, roundId }`. Call
    `initialize_wager_round(group, round)` (DB RPC) to create the `wager_rounds`
    row, reading `closes_at`. Then build + sign + send the on-chain
    `initialize_wager_round` transaction with `WAGER_AUTHORITY_KEYPAIR`; poll to
    confirm. Return `{ wagerRound, vault, signature, alreadyInitialized }`.
  - `GET /api/admin/wager/status?group=&round=` — returns presence flags:
    `configEnabled`, `wagerRoundExists`, `vaultExists`, and display fields.

- **Migration** — relax `configure_pool_wager` and `initialize_wager_round`
  owner checks to `is_group_owner(p_group_id) OR is_admin()`.

- **Shared lib** — `lib/wager/init-round.ts`: pure builder for the on-chain
  init transaction. Inputs: `groupId`, `roundId`, `mint`, `tokenProgram`,
  `closesAt`, `authority`, `settlementAuthority`. Reuses
  `deriveWagerRoundPda`, `deriveVaultAta`, `buildInitializeWagerRoundInstruction`.
  Fixed params mirror the CLI script: `refundTimeout = 48h`,
  `maxParticipants = 1000`, `maxTotalStake = 1_000_000_000_000`,
  `rentRecipientA = rentRecipientB = authority`. `scripts/init-wager-round.ts`
  is refactored to call this helper so the two paths cannot diverge.

## Data flow — enable a round end-to-end

1. Admin opens the page, picks a group.
2. Configure: enters mint + stake `1` → route reads mint (decimals `d`, token
   program) → base units `= 1 × 10^d` → `configure_pool_wager` →
   `group_wager_configs` row (`enabled = true`).
3. Initialize round: picks a round → `initialize_wager_round` (DB) creates the
   `wager_rounds` row (`closes_at` from `round_effective_close`) → on-chain init
   signed with `WAGER_AUTHORITY_KEYPAIR` → vault ATA created.
4. Status panel all green. The user deposit path (already wired) works once the
   feature flags are on.

## Environment / secrets

- `WAGER_AUTHORITY_KEYPAIR` — JSON byte array or base58 secret key; server-only;
  funded with devnet SOL (fee payer + authority).
- `WAGER_SETTLEMENT_AUTHORITY` — optional; defaults to the authority pubkey.
- Existing: `WAGER_RPC_URL`, `WAGER_PROGRAM_ID`, `WAGER_TOKEN_PROGRAM`.
- The admin page does **not** depend on `WAGER_DEPOSITS_ENABLED`, but warns when
  `WAGER_DEPOSITS_ENABLED` / `WAGER_UI_ENABLED` are false (the user path is not
  live yet).

## Error handling

- Mint not found / not a mint account → 400 with message.
- Not admin → 403.
- Missing/malformed `WAGER_AUTHORITY_KEYPAIR` → 500 with a clear message.
- RPC raises (round has no fixtures, round closed, wagering disabled) → surface
  the message to the UI.
- On-chain init idempotency: if the round PDA already exists, treat as
  "already initialized" (success). If the transaction fails, surface the error
  and leave the DB row in place (retryable).

## Testing

- Unit: mint-account parse/validation (decimals + token program from owner);
  base-units computation; `init-round` builder argument layout (mirrors
  `wager-instructions.test.ts`).
- Migration: SQL-shape test (as in `wager-sql.test.ts`) asserting both RPCs
  allow `is_admin()`.
- Routes: business logic lives in tested helpers; the routes themselves are thin
  and not unit-tested.

## Security

- Every route re-checks `is_admin` server-side, independent of the UI.
- DB RPCs enforce `is_group_owner OR is_admin()` (defense in depth).
- `WAGER_AUTHORITY_KEYPAIR` never leaves the server; it is not in the client
  bundle.
- Devnet-only, already enforced by the wager env and the RPC cluster checks.
