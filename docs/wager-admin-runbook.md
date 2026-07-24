# Wager Admin Runbook (devnet)

How a Winscore admin enables wagering for a pool round, end-to-end. Devnet only.

## Environment

Server-only (never expose to the client):

| Var | Required | Notes |
| --- | --- | --- |
| `WAGER_AUTHORITY_KEYPAIR` | yes | JSON byte array (Solana CLI keypair). Fee payer + authority for on-chain `initialize_wager_round`. Fund it with devnet SOL. |
| `WAGER_SETTLEMENT_AUTHORITY` | no | Base58 pubkey; defaults to the authority pubkey. |
| `WAGER_APPROVED_MINT` | for the CLI script | Approved SPL mint (base58). The admin UI reads the mint per-request instead. |
| `WAGER_RPC_URL` | no | Defaults to `https://api.devnet.solana.com`. |
| `WAGER_PROGRAM_ID` | no | Defaults to the declared program id. |
| `WAGER_TOKEN_PROGRAM` | no | Defaults to classic SPL Token. |

Feature flags (gate the **user** deposit path, not the admin console):

| Var | Effect |
| --- | --- |
| `WAGER_UI_ENABLED=true` | Renders the wager rail on the round page. |
| `WAGER_DEPOSITS_ENABLED=true` | Allows `/api/wager/prepare` + `/api/wager/submit`. |

The admin console warns when either flag is off (the user path is not live yet).

## Enable a round

1. Open `/<locale>/admin/wager` (admin only).
2. **Configure wagering** for a pool: pick the group, paste the devnet **mint** and a
   human **stake** (e.g. `1`). The route reads the mint on-chain to derive decimals
   and token program, then writes `group_wager_configs` (enabled).
3. **Initialize the round**: pick a round of that group and click Initialize. This
   creates the `wager_rounds` row and signs + sends the on-chain
   `initialize_wager_round` (creates the round PDA + vault ATA). Idempotent: if the
   PDA already exists it reports "already initialized" and sends nothing.
4. **Refresh status**: confirm config enabled · round row present · vault on-chain.
5. Set `WAGER_UI_ENABLED=true` and `WAGER_DEPOSITS_ENABLED=true` so the user path goes live.

## User prerequisites

Each entrant needs devnet SOL (fees + Entry PDA/ATA rent) and a balance of the
approved SPL token in their associated token account to stake.

## CLI fallback

`scripts/init-wager-round.ts` performs only the on-chain init (step 3) using
`WAGER_AUTHORITY_KEYPAIR` + `WAGER_APPROVED_MINT`; the DB config/round rows still
come from steps 2–3 of the console (or the `configure_pool_wager` /
`initialize_wager_round` RPCs).
