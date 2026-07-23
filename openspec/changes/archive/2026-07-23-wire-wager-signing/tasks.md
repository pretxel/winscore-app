## 1. Intent creation

- [x] 1.1 Add `createWagerIntent` server action in `app/[locale]/[league]/(app)/groups/[groupId]/rounds/[roundId]/` that inserts a `wager_intents` row with state `preparing`, linking the user, wallet_link_id, group, and round
- [x] 1.2 Pass the created `intentId` to `WagerRail` as a prop, replacing the hardcoded placeholder
- [x] 1.3 Add `intentId` to the `WagerRailProps` interface

## 2. Transaction signing

- [x] 2.1 Add `useConnectedWallet` and `useWalletAccountTransactionSigner` imports to `WagerRail`
- [x] 2.2 Build the Solana `enter` transaction from the IDL: derive PDAs, create instruction with `pickCommitment` and `intentHash`, fetch blockhash, compose transaction
- [x] 2.3 Replace the mock `handleConfirm` with: prepare → build tx → sign → submit → verify flow
- [x] 2.4 Set real `txSignature` from the submit result and pass it to the confirmed view

## 3. Error handling

- [x] 3.1 Catch wallet reject errors and show user-friendly message in the failed view
- [x] 3.2 Handle transaction expiry (blockhash timeout) with a retry path

## 4. Verify

- [x] 4.1 Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` — confirm clean
- [x] 4.2 End-to-end test: link wallet, view round with wager enabled, confirm entry, verify explorer link
