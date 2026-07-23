## Context

The `WagerRail` component at `components/wager/wager-rail.tsx` is embedded in the round prediction board page. It receives props: `poolId`, `roundId`, `wagerAvailable`, `walletLinked`, `walletAddress`, and eligibility flags. It has a view state machine (`overview → consent → confirming → confirmed → failed`).

The backend (`lib/wager/`) is complete: intent state machine, entry saga, pick commitments, PDA derivation, Solana program IDL, on-chain verification, Merkle tree settlement. The only gap is the client-side connection.

The Solana wallet infrastructure is already live (as of the previous change): `ClientProvider` wraps the app, `useWallets()/useConnect()/useSignMessage()` work.

## Goals / Non-Goals

**Goals:**
- Replace `intentId: "placeholder"` with a real intent created server-side before the rail renders
- Wire `handleConfirm` to sign a real Solana transaction via the connected wallet and submit it
- Call `verifyEntryTransaction()` after submission and show success/failure with explorer links
- Reuse existing `/api/wager/prepare` and `lib/wager/*` modules

**Non-Goals:**
- Changing the wager program on Solana (it's already deployed)
- Adding new API routes (reuse existing)
- Modifying the intent state machine or entry saga
- Wiring claim/refund flows (those are follow-up)

## Decisions

**Create intent server-side before rendering the rail.** The round page (server component) will call a new `createWagerIntent()` server action that inserts a `wager_intents` row (state: `preparing`) with the user's group/round/wallet_link IDs. The intent ID is passed as a prop to `WagerRail`. Rationale: the rail needs a real ID to call `/api/wager/prepare`; creating it server-side avoids a client-side race and keeps the rail focused on UI.

**Use `@solana/react` hooks for transaction signing.** The `WagerRail` already imports from `lucide-react` and `@/components/ui/*`. We'll add `useWalletAccountTransactionSigner` from `@solana/react` (takes a `UiWalletAccount`, returns a `TransactionModifyingSigner`). After the wallet is connected, we get the account from `useConnectedWallet()` and use its signer to sign the serialized transaction. Rationale: consistent with the wallet-linking flow; reuse existing `ClientProvider`.

**Prepare → Sign → Submit → Verify in sequence.** The flow is:
1. Call `/api/wager/prepare` with intent ID → get serialized transaction bytes
2. Deserialize, sign with wallet signer
3. Submit signed transaction to Solana RPC
4. Call `verifyEntryTransaction(signature, intentId)` to confirm on-chain
5. Show success (with explorer link) or failure

Rationale: this matches the existing placeholder flow structure; each step has a clear error boundary.

**Reuse `useConnectedWallet()` to get the active wallet account.** The `WalletLinkButton` already connects the wallet. After connection, `useConnectedWallet()` returns `{ account, ... }`. The wager rail can use this to get the account for signing. Rationale: single source of truth for wallet state; no need to reconnect.

## Risks / Trade-offs

- [Transaction expiry] → Solana transactions have a short blockhash lifetime (~150 slots / ~60s). If the user takes too long to sign, the transaction expires. Mitigation: `rebuildExpiredTransaction()` in `lib/wager/blockhash-rebuild.ts` handles this; the rail should catch the expiry error and retry.
- [Wallet not on Devnet] → The user might have Phantom set to Mainnet. The transaction would fail. Mitigation: the wallet signer plugin is configured for `solana:devnet`; Phantom auto-switches or prompts.
- [prepare API returns serialized tx bytes] → The current `/api/wager/prepare` only returns `{ ok: true, intentId }`. It doesn't return a transaction to sign. Mitigation: extend the prepare route to return the serialized transaction, or have the client build the transaction from intent data.

## Open Questions

- Does `/api/wager/prepare` need to be extended to return a signable transaction, or does the client construct the transaction from the IDL? (Need to check the actual prepare route implementation.)
