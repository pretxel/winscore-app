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

## Program deployment

The deployed devnet program is `9q5fBczvg3XYipRmxY5tt3axGgNQfYtGeaDpbMHMLkmi`, and
its upgrade authority is the same keypair as `WAGER_AUTHORITY_KEYPAIR`
(`5WReDH2phKadrF1f6jzx7ddscKZVbtoZsNgZ2Egt1NuB`).

**The currently deployed binary predates the account-size fix**, so
`initialize_wager_round` still fails with `AccountDidNotDeserialize` (3003) —
`WAGER_ROUND_SIZE` was 15 bytes short of what `WagerRound` serializes to. Rebuild
and redeploy before anything on-chain can work:

```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
cd solana/winscore-wager && anchor build
solana program deploy target/deploy/winscore_wager.so \
  --program-id 9q5fBczvg3XYipRmxY5tt3axGgNQfYtGeaDpbMHMLkmi \
  --keypair ~/.config/solana/winscore-wager-authority-devnet.json \
  --upgrade-authority ~/.config/solana/winscore-wager-authority-devnet.json \
  --url devnet
```

A redeploy stages the new binary in a temporary buffer, so the authority needs
roughly **twice** the program's rent on hand — about 2.65 SOL plus fees for a
379 KB program, on top of whatever it already holds in the deployed account. Top
it up first (`solana airdrop 2 <authority> --url devnet`; the public faucet
rate-limits, so this may need retrying later or a different faucet). A deploy that
runs out of funds aborts atomically and leaves nothing behind, but check for a
stranded buffer afterwards and reclaim its rent if one exists:

```bash
solana program show --buffers --keypair ~/.config/solana/winscore-wager-authority-devnet.json --url devnet
solana program close <buffer-address> --url devnet   # only if one is listed
```

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

### Current devnet state

Steps 2 and 3's **database** side is already done for the "Test group" pool on
Liga MX Jornada 3, so re-running the console will report the config and round as
existing rather than creating duplicates:

| | |
| --- | --- |
| Pool | Test group (`b2f35633-c848-4ce4-a625-1a521b739be3`) |
| Round | Liga MX Jornada 3 (`6a85d0cb-cc42-4f93-8b7e-0cc5a907653a`), closes 2026-08-01 01:00 UTC |
| Stake | `1000000` base units = 1 token at 6 decimals |
| Mint | `2iRUoo68otakZk8dTNyVJJVtvQAm7po62PFwRNQ7Dkjr` |
| Round PDA | `GXjSTxecweLm5fvh4gKfnzQJF8NC61TW4GdgbC2K43yZ` (not yet created) |
| Vault ATA | `FgUWReBnM2bhV2aEtFa3ueyGWSRhz4gv9CuNA7CYyu84` (not yet created) |

The **on-chain** half of step 3 is outstanding, blocked on the redeploy above.
Once the program carries the account-size fix, running Initialize for this round
creates the PDA and vault; `WAGER_SETTLEMENT_ENABLED` is still unset, so
settlement stays off until a round has entries worth settling.

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

Current coverage:

| Competition | Fixtures | Rounds | Wagerable |
| --- | --- | --- | --- |
| Liga MX Apertura 2026 | 153 | 17 Jornadas | yes |
| La Liga 2026-27 | 380 | 38 Matchdays | yes, once `status='active'` |
| World Cup 2026 | 104 | none | no |

La Liga is seeded at `status='manage'`, so it is invisible to players until an
admin activates it — flip it with `set_league_live()` or the admin console when
you want pools on it. Its rounds are all `pending` for the same reason.

World Cup has no rounds because its 72 group fixtures carry no matchday: neither
the seed nor `scripts/generate-fixtures-sql.mjs` captured one, and inferring
rounds from dates is forbidden. Wagering on it needs the official FIFA matchday
data first.

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

## Result sync (settlement depends on it)

Settlement will not run until every fixture in the round is `final` with scores,
so a wagered round is only settleable if result sync is actually reaching the
competition. `/api/cron/sync-matches` runs daily at 09:00 UTC and tries providers
in order, escalating to the next when one hard-fails, returns nothing, or leaves
overdue fixtures unresolved.

| Competition | football-data (primary) | ESPN (fallback) |
| --- | --- | --- |
| World Cup 2026 | `WC` — works | `fifa.world` — works |
| Liga MX Apertura 2026 | `LMX` — **HTTP 403, not in the plan** | `mex.1` — works |
| La Liga 2026-27 | `PD` — works | `esp.1` — works |

Liga MX therefore depends on ESPN alone. That is handled — football-data's throw
is caught and the run escalates, verified live: `source=espn fetched=9` for the
Jornada 3 window — but it means Liga MX has no second source. If ESPN's
`mex.1` feed changes shape, results stop updating and rounds stop being
settleable. Widening football-data's plan to include Liga MX would restore a real
fallback.

Two failure modes here are silent by nature, so check for them when results look
stale:

- **Wrong `espn.leaguePath`.** `mex.liga` returned HTTP 400 on every call, which
  meant Liga MX had no working provider at all. Fixed to `mex.1` in
  `20260726000000`. Verify with:
  `curl -s --compressed "https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard?dates=20260801" | head -c 200`
- **An alias pointing at a name no fixture uses.** result-sync normalizes the
  remote name, finds no local match, logs `unmatched remote`, and writes nothing.
  `tests/team-name-aliases.test.ts` now asserts every Liga MX alias target is a
  real seeded team, and that the exact strings ESPN sends all resolve.

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
