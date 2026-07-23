## ADDED Requirements

### Requirement: Authenticated profile page

The app SHALL expose a profile/account page at `/[locale]/profile` under the authenticated `(app)` route group. An unauthenticated visitor SHALL be redirected to sign-in, consistent with other `(app)` pages.

#### Scenario: Signed-in user opens the profile page
- **WHEN** a signed-in user navigates to `/[locale]/profile`
- **THEN** the profile page renders with a Wallet section

#### Scenario: Unauthenticated visitor is redirected
- **WHEN** a visitor without a session navigates to `/[locale]/profile`
- **THEN** they are redirected to sign-in

### Requirement: Wallet section reflects the active link on load

The Wallet section SHALL resolve the caller's active wallet link server-side (`wallet_links` where `user_id` is the current user AND `is_active` is true) and render the linked state on first paint — no client-side flash from an unlinked default. The linked state SHALL show the linked wallet address (truncated), the cluster, and an Unlink control.

#### Scenario: User with a linked wallet
- **WHEN** a user with an active `wallet_links` row opens the profile page
- **THEN** the Wallet section shows the truncated wallet address and cluster
- **AND** an Unlink control is present
- **AND** no "link your wallet" empty state is shown

#### Scenario: User with no linked wallet
- **WHEN** a user with no active wallet link opens the profile page
- **THEN** the Wallet section shows an empty state with a link/connect entry point
- **AND** no linked address is shown

### Requirement: Unlink surfaces backend outcome

The Unlink control SHALL call the existing `/api/wallet/unlink` route and reflect its outcome. When unlink is refused (e.g. the wallet has pending wager intents), the section SHALL surface the returned error legibly rather than appearing to succeed.

#### Scenario: Successful unlink
- **WHEN** the user unlinks a wallet with no blocking pending intents
- **THEN** the wallet link is deactivated
- **AND** the section returns to the empty (unlinked) state

#### Scenario: Unlink refused
- **WHEN** the user attempts to unlink a wallet that has pending wager intents
- **THEN** the section shows the refusal reason
- **AND** the wallet remains linked

### Requirement: Reuse existing wallet backend

The Wallet section SHALL reuse the existing `WalletLinkButton` and the `/api/wallet/{challenge,verify,unlink}` routes. This change SHALL NOT add new wallet API routes, alter wallet-linking security, or change the `wallet_links` schema.

#### Scenario: No new backend introduced
- **WHEN** the profile Wallet section links or unlinks a wallet
- **THEN** it uses the existing wallet challenge/verify/unlink routes
- **AND** no new wallet API route or `wallet_links` column is introduced
