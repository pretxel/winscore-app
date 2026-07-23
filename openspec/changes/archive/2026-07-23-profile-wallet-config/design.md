## Context

Wallet linking already has a working backend: `POST /api/wallet/{challenge,verify,unlink}`, the `wallet_links` table (`user_id`, `wallet_address`, `id`, `cluster`, `is_active`, `linked_at`, `unlinked_at`), and a client `WalletLinkButton`. Today the button is rendered only inside a wager round page (`[league]/(app)/groups/[groupId]/rounds/[roundId]`), takes no props, and always initializes to `state: "idle"` — so it can't reflect an already-linked wallet on load. Its real "connect + sign" step is a placeholder ("Wallet integration pending"); unlink is fully wired. The unlink API refuses to unlink while the wallet has pending `wager_intents` (`preparing`/`awaiting_signature`/`submitted`).

There is no profile/account page. The only profile surface is the `UserMenu` dropdown (display name + email prefs via `app/[locale]/profile-actions.ts`). Authenticated pages live under `app/[locale]/(app)/…` and redirect unauthenticated users to sign-in.

## Goals / Non-Goals

**Goals:**
- A dedicated authenticated profile page at `/[locale]/(app)/profile` with a Wallet section.
- Server-resolve the caller's active wallet link and render linked vs. empty state correctly on first paint.
- Reuse `WalletLinkButton` + existing wallet APIs; surface link status + unlink.
- Provide an entry point from the `UserMenu`.

**Non-Goals:**
- Real Solana wallet-adapter connect/sign (`@solana/react` / Wallet Standard) — stays placeholder; follow-up.
- Moving display-name / email-pref editing onto the page (they stay in the menu for now; the page can host them later).
- Any change to wallet-linking security, the API routes' behavior, or the `wallet_links` schema.

## Decisions

**New route `app/[locale]/(app)/profile/page.tsx` (Server Component).** It resolves the Supabase user (redirect to sign-in if absent, matching sibling `(app)` pages), queries `wallet_links` for `user_id = me AND is_active = true` (selecting `id`, `wallet_address`, `cluster`, `linked_at`), and renders a Wallet section. Rationale: server read means the linked state is correct on first paint with no client flash; auth gating mirrors existing `(app)` convention.

**Seed `WalletLinkButton` from props instead of always starting idle.** Add optional `initialWalletAddress`, `initialLinkId`, `initialCluster` props; when `initialWalletAddress` is present the component initializes to `state: "linked"` with those values, so the profile page shows the linked card + Unlink immediately. Existing prop-less usage (wager round page) keeps working (defaults → idle). Rationale: smallest change that makes the shared button render server-known state; avoids a second data-fetch path.
- Alternative — a separate read-only "linked wallet" display component: rejected, duplicates the linked-card UI and the unlink handler already in the button.

**Display the real cluster, not a hardcoded "Devnet" badge.** The button currently hardcodes `Devnet`; pass `initialCluster` (from the link row) so the badge reflects the actual cluster. When unknown, fall back to the existing label. Low-risk polish riding along with the props change.

**Entry point from `UserMenu`.** Add a "Profile" (account) link in the dropdown to `/[locale]/profile`, using a new `profileMenu` i18n key. Keeps discovery consistent with the existing profile surface.

**i18n scope.** New page chrome (section title, empty-state copy, "Profile" menu label) uses next-intl keys added to all locales. The `WalletLinkButton`'s internal English strings are pre-existing and left as-is (noted as debt) to keep this change focused.

## Risks / Trade-offs

- [Unlink blocked by pending wager intents surfaces as a generic error] → The button already renders the API error text; ensure the profile section shows it legibly so users understand why unlink was refused.
- [Placeholder connect confuses users on the profile page] → The linked/empty copy should make clear that connecting a wallet needs a Solana wallet extension (matching the button's existing message); full connect is the follow-up.
- [Prop seeding drift with the button's internal state machine] → Only the initial `useState` values change; the existing transitions (connecting/linked/unlinking/error) are untouched. Cover linked-on-load and unlink in verification.

## Migration Plan

Additive. New route + optional props + one menu link + i18n keys. No data or API migration. Rollback = remove the route and the menu link; the button's new props are optional and inert without them.

## Open Questions

- Should the profile page become the long-term home for display-name/email-pref editing (migrated out of the dropdown)? Out of scope now; the page is structured so those sections can be added later.
