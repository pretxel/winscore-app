# Wager Admin Runbook (devnet)

How a Winscore admin enables wagering for a pool round, end-to-end. Devnet only.

## Environment

Server-only (never expose to the client):

| Var | Required | Notes |
| --- | --- | --- |
| `WAGER_AUTHORITY_KEYPAIR` | yes | Fee payer + authority for on-chain `initialize_wager_round`; fund with devnet SOL. The admin console requires an **inline JSON byte array**. The CLI script accepts **either** inline JSON or a path to a keypair JSON file. |
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
| `WAGER_SETTLEMENT_ENABLED=true` | Allows settling a round and claiming awards. Refunds stay available regardless, so a cancelled round can always be unwound. |

The admin console warns when either deposit flag is off (the user path is not live yet).

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

## Prerequisite: rounds must exist

A pool round can only be wagered on if `competition_rounds` has the round and its
fixtures carry `matches.round_id`. Rounds are populated from trusted provider
round naming — see `supabase/migrations/20260722204537_round_backfill_template.sql`
— and are **never** inferred from dates or ISO weeks. With no rounds, the console
has nothing to initialize and settlement scores zero points.

Check both before trying to enable a round:

```sql
select count(*) from public.competition_rounds;
select count(*) from public.matches where round_id is not null;
```

## Settle a round

1. `GET /api/admin/wager/settle?wagerRoundId=…` reports readiness and the blocker
   if any. A round must be closed, every fixture final or cancelled with scores,
   past the 1-hour correction delay, and hold at least one confirmed entry.
2. `POST /api/admin/wager/settle` with `{ "wagerRoundId": "…" }`. This scores the
   entries via `score_wager_round_entries` (the canonical primitives, so wagered
   and free standings cannot diverge), builds the manifest and Merkle tree, sends
   `lock` + `settle` in one transaction, then writes `wager_settlements` and the
   pending `wager_claims`.
3. Winners claim through `POST /api/wager/claim` (returns an unsigned transaction
   their wallet signs), then `POST /api/wager/claim/confirm` records it after
   verifying the Claim PDA on chain.

Settling is irreversible on chain. Re-running it is safe — it reports the round as
already settled rather than settling twice.

## Cancel and refund

`activateRefund` (in `lib/wager/claim-refund.ts`) marks the round cancelled in the
database. The on-chain `cancel_and_refund` still has to land — sent by the round
authority, or by anyone once `closes_at + refund_timeout` (48h) elapses — before
`POST /api/wager/refund` transactions will succeed.

## Reconciliation

`/api/cron/wager-reconcile` converges intents whose confirmation was never
observed (lost callback, closed tab, timed-out submit). It anchors on the
deterministic Entry PDA and proves each candidate signature before recording an
entry, so a retry cannot double-count a deposit.

It is scheduled **daily at 10:00 UTC**, not every 30 minutes: Vercel Hobby
accounts reject any cron running more than once a day. A user whose deposit
landed but whose confirmation was lost therefore stays pending for up to 24h —
so when someone reports a stuck entry, run it on demand from
`/<locale>/admin/operations` ("Wager reconciliation" → Run now) rather than
waiting for the schedule. Moving to the Pro plan is what unblocks a tighter
interval.

## User prerequisites

Each entrant needs devnet SOL (fees + Entry PDA/ATA rent) and a balance of the
approved SPL token in their associated token account to stake.

## CLI fallback

`scripts/init-wager-round.ts` performs only the on-chain init (step 3) using
`WAGER_AUTHORITY_KEYPAIR` (inline JSON or file path) + `WAGER_APPROVED_MINT`; the DB config/round rows still
come from steps 2–3 of the console (or the `configure_pool_wager` /
`initialize_wager_round` RPCs).
