## Why

The app already has a full wallet-linking backend (challenge/verify/unlink API routes, `wallet_links` table, `WalletLinkButton`), but the only place a user can link a Solana wallet today is buried inside a wager round page. There's no personal, account-level place to see whether a wallet is linked, view the linked address, or unlink it. Players who wager need a stable "profile" home to configure their crypto wallet independent of any single round.

## What Changes

- Add a new authenticated profile/account page at `/[locale]/(app)/profile` with a **Wallet** section.
- The Wallet section reads the caller's active wallet link (`wallet_links` where `user_id = me AND is_active`) server-side and shows: linked state, the linked wallet address (truncated), cluster, linked date, and an **Unlink** control; or a link/connect entry point when no wallet is linked.
- Reuse the existing `WalletLinkButton` and the `/api/wallet/{challenge,verify,unlink}` routes. Pass the server-resolved link status into the button so it renders the correct initial state (linked vs. unlinked) instead of always starting `idle`.
- Add an entry point to the new page from the profile menu (UserMenu) so users can reach it.
- **Out of scope** (follow-up): wiring a real Solana wallet adapter (`@solana/react` / Wallet Standard) for end-to-end connect + sign. The connect action remains the existing placeholder; this change surfaces link status + unlink and the entry point.

## Capabilities

### New Capabilities
- `profile-wallet-config`: The authenticated profile page and its Wallet section — route, auth gating, how the active wallet link is resolved and displayed, the link/unlink controls surfaced, and empty/linked states.

### Modified Capabilities
- `profile-menu`: Add an entry point (link) from the profile menu to the new profile/account page.

## Impact

- **Code**: new `app/[locale]/(app)/profile/page.tsx` (+ a small wallet-section piece); `components/wallet/wallet-link-button.tsx` (accept initial linked-state props); `components/user-menu.tsx` (+ profile link); i18n message files under `messages/`.
- **Data**: reads `wallet_links` for the current user; no schema changes.
- **APIs/dependencies**: none new (reuses existing wallet API routes).
- **Auth**: page is auth-only (redirects unauthenticated users to sign-in), consistent with other `(app)` pages.
