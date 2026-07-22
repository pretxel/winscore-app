# Devnet Policy Constants

**Date:** 2026-07-22
**Review:** Update before any Mainnet work

## Challenge / Wallet Linking

| Constant | Value | Rationale |
|---|---|---|
| `CHALLENGE_EXPIRY_SECONDS` | 300 (5 min) | Short window for Devnet; production should be 60-120s |
| `CHALLENGE_NONCE_BYTES` | 32 | Cryptographic nonce length |
| `MAX_ACTIVE_LINKS_PER_USER` | 3 | Allow multi-device wallet usage |

## Wager Entry

| Constant | Value | Rationale |
|---|---|---|
| `DEFAULT_STAKE_BASE_UNITS` | 1_000_000_000 (1 token with 9 decimals) | Fixed per-design; one mint only |
| `MAX_PARTICIPANTS_PER_ROUND` | 100 | Devnet cohort cap |
| `MAX_STAKE_TOTAL_BASE_UNITS` | 100_000_000_000 (100 tokens) | Program-level total deposit cap |
| `INTENT_EXPIRY_SECONDS` | 300 (5 min) | Expected blockhash lifetime + buffer |
| `BLOCKHASH_FRESHNESS_SECONDS` | 60 | Renew blockhash if older |

## Settlement

| Constant | Value | Rationale |
|---|---|---|
| `CORRECTION_DELAY_SECONDS` | 3600 (1 hour) | Devnet: allow fixture corrections before settlement; production should be longer (24h+) |
| `SETTLEMENT_TIMEOUT_SECONDS` | 604800 (7 days) | After which permissionless refund is available |
| `CONFIRMATION_COMMITMENT` | `"confirmed"` | Devnet standard; production should use `"finalized"` |

## Rate Limits

| Constant | Value |
|---|---|
| `CHALLENGE_RATE_LIMIT` | 5 per user per hour |
| `INTENT_RATE_LIMIT` | 10 per user per hour |
| `INIT_RATE_LIMIT` | 5 per pool owner per hour |
| `SETTLEMENT_RATE_LIMIT` | 20 per operator per hour |

## RPC Configuration

| Setting | Value |
|---|---|
| Default RPC URL | `https://api.devnet.solana.com` |
| WebSocket URL | `wss://api.devnet.solana.com` |
| Dedicated RPC | Configurable via `SOLANA_RPC_URL` env var |
| Max retry attempts | 3 |
| Backoff base (ms) | 1000 |
| Backoff max (ms) | 30000 |
| Jitter | ±25% |

## Eligibility Hooks (Devnet Placeholders)

All eligibility checks are deny-by-default with explicit Devnet test values:

- **Age confirmation:** Minimum 18 years (placeholder; legal review needed before Mainnet)
- **Jurisdiction/geofencing:** Allow all for Devnet (prompt UI acceptance)
- **Self-exclusion:** No-op on Devnet (check database flag)
- **Stake limits:** Per-round participant cap
- **Terms acceptance:** Versioned, recorded per-intent

## Feature Flags

| Flag | Default | Controls |
|---|---|---|
| `WAGER_UI_ENABLED` | `false` | Wager rail visibility |
| `WAGER_INIT_ENABLED` | `false` | Escrow initialization |
| `WAGER_DEPOSITS_ENABLED` | `false` | New deposits/intents |
| `WAGER_SETTLEMENT_ENABLED` | `false` | Settlement operations |
| `WAGER_KILL_DEPOSITS` | `false` | Emergency deposit kill (claims/refunds remain) |

## Cluster Enforcement

- Config parser accepts only `"devnet"` cluster value
- `"mainnet-beta"`, `"testnet"`, and unknown values fail closed
- Program ID, mint address, and token program are validated per-cluster
