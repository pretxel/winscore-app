## ADDED Requirements

### Requirement: Intent is created server-side before rail renders

The round page SHALL create a `wager_intents` row (state: `preparing`) server-side and pass the `intentId` to `WagerRail` as a prop. The rail SHALL NOT hardcode or generate a placeholder ID.

#### Scenario: Intent passed to rail
- **WHEN** a user with a linked wallet and complete picks views a round page with wagering enabled
- **THEN** a `wager_intents` row is created with the user's picks
- **AND** the intent ID is passed as a prop to `WagerRail`

### Requirement: Wager rail signs transactions with connected wallet

The `WagerRail` SHALL use the connected Solana wallet to sign wager entry transactions. The `handleConfirm` flow SHALL call `/api/wager/prepare`, build the transaction from the returned data, present it to the wallet for signing, submit to Solana Devnet, and verify on-chain.

#### Scenario: Successful wager entry
- **WHEN** user confirms the wager from the consent view
- **THEN** the rail calls `/api/wager/prepare` with the real intent ID
- **AND** the transaction is signed by the user's wallet
- **AND** the signed transaction is submitted to Solana Devnet
- **AND** `verifyEntryTransaction()` confirms the on-chain entry
- **AND** the confirmed view shows the transaction signature with an explorer link

#### Scenario: Transaction signing fails
- **WHEN** the user rejects the transaction in their wallet
- **THEN** the rail shows the failed view with the error message
- **AND** a retry button is present

### Requirement: Existing wallet infrastructure is reused

The wager rail SHALL reuse the existing `ClientProvider`, `useConnectedWallet()`, and `@solana/kit` infrastructure. It SHALL NOT create a separate wallet connection or bypass the existing provider.

#### Scenario: Reuses connected wallet
- **WHEN** the wager rail needs to sign a transaction
- **THEN** it reads the account from `useConnectedWallet()`
- **AND** uses `useWalletAccountTransactionSigner()` to sign
