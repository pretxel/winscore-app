## Why

The `WagerRail` component renders the Matchday Wager UI on round pages but uses placeholder values (`intentId: "placeholder"`, mock signatures) instead of calling the real wager backend. The backend (`lib/wager/`) is fully built — intent creation, PDA derivation, pick commitments, transaction signing, on-chain verification, and settlement — but the client-side rail hasn't been wired to it. Users can link a wallet but can't actually enter a wager.

## What Changes

- Replace the hardcoded `intentId: "placeholder"` in `wager-rail.tsx` with a real intent ID created via a server action before the rail renders
- Wire up the `handleConfirm` flow to sign transactions with the connected wallet using `@solana/react` and `@solana/kit-plugin-wallet/react` hooks
- Call `/api/wager/prepare` with the real intent, sign the transaction, submit to Solana Devnet via RPC, and call `verifyEntryTransaction` to confirm on-chain
- Surface transaction signatures with Solana Explorer links (already in the UI, just needs real data)
- Add a `createWagerIntent` server action that creates a `wager_intents` row with the user's picks and returns the intent ID

## Capabilities

### Modified Capabilities
- `profile-wallet-config`: The Wallet section already shows linked wallet details — this change wires it into the wager flow by using the linked wallet for transaction signing.

### New Capabilities
- `wager-rail-signing`: The client-side wager flow — intent creation, transaction preparation, wallet signing, on-chain submission, and verification — replacing the placeholder with real Solana Devnet transactions.

## Impact

- **Code**: `components/wager/wager-rail.tsx` (rewrite `handleConfirm` to use wallet hooks + real APIs); new server action for intent creation; new route or action for calling `/api/wager/prepare` with real data
- **Dependencies**: already installed (`@solana/react`, `@solana/kit`, `@solana/kit-plugin-wallet`)
- **Data**: writes to `wager_intents`, reads from `wallet_links`; no schema changes
- **API**: reuses existing `/api/wager/prepare` and `lib/wager/*` modules; no new API routes needed
