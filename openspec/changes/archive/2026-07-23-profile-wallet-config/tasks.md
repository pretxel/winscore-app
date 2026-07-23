## 1. i18n

- [x] 1.1 Add a `profile` namespace (keys: page title/eyebrow, wallet section title, linked/empty-state copy) to every locale under `messages/`, and a `profileMenu.profile` label for the menu entry
- [x] 1.2 Verify keys load via `getTranslations("profile")` / `getTranslations("profileMenu")` with no missing-key warnings across locales

## 2. WalletLinkButton seed props

- [x] 2.1 Add optional `initialWalletAddress`, `initialLinkId`, `initialCluster` props to `components/wallet/wallet-link-button.tsx`; when `initialWalletAddress` is set, initialize `state` to `"linked"` and seed `walletAddress`/`linkId` from props (prop-less usage still defaults to `idle`)
- [x] 2.2 Render the cluster badge from `initialCluster` when provided, falling back to the current label; keep existing transitions untouched

## 3. Profile page + Wallet section

- [x] 3.1 Create `app/[locale]/(app)/profile/page.tsx` (Server Component): resolve the Supabase user, redirect to sign-in if absent, `setRequestLocale`, and render the page shell with a Wallet section
- [x] 3.2 Query `wallet_links` for `user_id = me AND is_active = true` (select `id`, `wallet_address`, `cluster`, `linked_at`); pass the result into `WalletLinkButton` as the initial props (or render the empty state when none)
- [x] 3.3 Show linked details (truncated address, cluster, linked date) and the Unlink control in the linked state; show the empty/connect entry point otherwise; ensure unlink errors surface legibly
- [x] 3.4 Add a `loading.tsx` if consistent with sibling `(app)` pages

## 4. Menu entry point

- [x] 4.1 Add a "Profile" link to `components/user-menu.tsx` pointing to `localePath(locale, "/profile")`, using the `profileMenu.profile` label

## 5. Verify

- [x] 5.1 Signed-in user sees the profile page; unauthenticated visitor is redirected to sign-in
- [x] 5.2 Linked-on-load renders the address + cluster + Unlink with no unlinked flash; no-link renders the empty state
- [x] 5.3 Run `pnpm lint`, `pnpm typecheck`, and `pnpm test`; confirm clean (new files add zero type errors)
