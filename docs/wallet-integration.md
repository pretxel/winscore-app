# Solana Wallet Integration

Winscore uses Ed25519-based challenge-sign-verify to link a user's Solana wallet for on-chain wager settlement. This document covers the architecture, API, and how to implement real wallet-extension connectivity.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  WalletLinkButton │────▶│ POST /api/wallet/ │────▶│ wallet_link_    │
│  (client)         │     │ challenge         │     │ challenges      │
└────────┬────────┘     └──────────────────┘     └────────┬────────┘
         │ sign                                            │
         ▼                                                 ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Solana Wallet   │────▶│ POST /api/wallet/ │────▶│ wallet_links    │
│  (user's device) │     │ verify            │     │ (is_active=true)│
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                         │
                                              ┌──────────▼──────────┐
                                              │ POST /api/wallet/   │
                                              │ unlink              │
                                              └─────────────────────┘
```

### Flow

1. **Challenge** — client sends `walletAddress` + `cluster` → server creates a signed message with nonce, domain, user ID, and 5-minute expiry
2. **Sign** — user's Solana wallet signs the challenge message with its Ed25519 private key
3. **Verify** — client sends `challengeId` + `signature` + `walletAddress` → server verifies the Ed25519 signature against the stored challenge, then creates an active `wallet_links` row
4. **Unlink** — deactivates the link unless pending wager intents, entries, or claims exist

---

## API Reference

### `POST /api/wallet/challenge`

Creates a one-time signing challenge.

**Request:**
```json
{
  "walletAddress": "4kdasHzm61vZ1GJNCxSJorHb8hEYFd36RvugXcPQEnM3",
  "cluster": "devnet"
}
```

**Response (201):**
```json
{
  "challengeId": "uuid",
  "message": "winscore.solana.wallet-link.v1\nDomain: winscore.app\nUser: user-uuid\nWallet: 4kdasHz...\nCluster: devnet\nIssued: 2026-07-23T...\nExpires: 2026-07-23T...\nNonce: abc123...",
  "expiresAt": "2026-07-23T12:05:00.000Z"
}
```

### `POST /api/wallet/verify`

Verifies the signature and creates a wallet link.

**Request:**
```json
{
  "challengeId": "uuid",
  "signature": [64 byte Ed25519 signature as number[]],
  "walletAddress": "4kdasHzm61vZ1GJNCxSJorHb8hEYFd36RvugXcPQEnM3"
}
```

**Response (201):**
```json
{
  "linkId": "uuid",
  "walletAddress": "4kdasHzm61vZ1GJNCxSJorHb8hEYFd36RvugXcPQEnM3",
  "cluster": "devnet"
}
```

### `POST /api/wallet/unlink`

Deactivates an active wallet link.

**Request:**
```json
{
  "linkId": "uuid"
}
```

**Response (200):**
```json
{ "ok": true }
```

**Error (409):**
```json
{
  "error": "Cannot unlink: pending wager intents exist",
  "pendingIntents": 2
}
```

---

## Database Schema

### `wallet_link_challenges`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles.id |
| `wallet_address` | bytea | Decoded Base58 → 32 bytes |
| `domain` | text | Origin of the request |
| `cluster` | text | Always `devnet` |
| `nonce` | bytea | 32 random bytes |
| `message_text` | text | Full challenge message the wallet signs |
| `issued_at` | timestamptz | |
| `expires_at` | timestamptz | 5 minutes after issued |
| `consumed` | boolean | Set true on successful verify |

### `wallet_links`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → profiles.id |
| `wallet_address` | bytea | Decoded Base58 → 32 bytes |
| `challenge_id` | uuid | FK → wallet_link_challenges.id |
| `signature_bytes` | bytea | 64-byte Ed25519 signature |
| `cluster` | text | Always `devnet` |
| `is_active` | boolean | Only one per user |
| `linked_at` | timestamptz | |
| `unlinked_at` | timestamptz | Set on deactivation |
| `created_at` | timestamptz | |

---

## Client-Side Integration

### Current state (MVP placeholder)

The `WalletLinkButton` handles the UI state machine (`idle → connecting → linked → unlinking → error`) and calls the API routes. The connect step is a **placeholder**: no real wallet extension is invoked. Users see "Wallet integration pending — install a Solana wallet extension."

### Production implementation (using `@solana/react`)

The project already has `@solana/kit`, `@solana/react`, and `@solana/kit-plugin-wallet` installed. To wire real wallet connectivity:

**1. Wrap your app with the Solana provider:**
```tsx
// app/providers.tsx
"use client";

import { ClientProvider } from "@solana/react";
import { createRpc } from "@solana/kit";

const rpc = createRpc({ url: "https://api.devnet.solana.com" });

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  return <ClientProvider rpc={rpc}>{children}</ClientProvider>;
}
```

**2. Use `useWallets()` in WalletLinkButton:**
```tsx
import { useWallets } from "@solana/react";
import { address } from "@solana/kit";

function WalletLinkButton() {
  const wallets = useWallets();
  // wallets gives you connected wallet instances:
  //   wallets.map(w => w.address)  → Base58 addresses
  //   w.signMessages(messages)     → ask wallet to sign

  const handleLink = async () => {
    const wallet = wallets[0]; // or let user pick
    if (!wallet) {
      setError("No Solana wallet found. Install Phantom or Solflare.");
      return;
    }

    const addr = await address(wallet.address);

    // 1. Create challenge
    const challengeResp = await fetch("/api/wallet/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress: addr,
        cluster: "devnet",
      }),
    });
    const { challengeId, message } = await challengeResp.json();

    // 2. Ask wallet to sign the message
    const encoder = new TextEncoder();
    const [signature] = await wallet.signMessages([
      { message: encoder.encode(message) },
    ]);

    // 3. Verify on server
    const verifyResp = await fetch("/api/wallet/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeId,
        signature: Array.from(signature),
        walletAddress: addr,
      }),
    });

    if (verifyResp.ok) {
      const { linkId } = await verifyResp.json();
      setLinkId(linkId);
      setWalletAddress(addr);
      setState("linked");
    }
  };
}
```

---

## For Users: How to Link Your Wallet

1. **Install a Solana wallet browser extension** — [Phantom](https://phantom.app/), [Solflare](https://solflare.com/), or [Backpack](https://backpack.app/)
2. **Set up your wallet** — create a new wallet or import an existing one. Switch to **Devnet** (not Mainnet) in the wallet settings
3. **Get Devnet SOL** — use the [Solana Faucet](https://faucet.solana.com/) to airdrop test SOL to your Devnet address
4. **Go to your Winscore profile** at `/profile`
5. **Click "Link Wallet"** — your wallet extension will prompt you to connect and sign a verification message
6. **Sign the message** — this proves you own the wallet without exposing your private key

---

## Supported Clusters

| Cluster | Status |
|---------|--------|
| `devnet` | Supported (default) |
| `testnet` | Not yet |
| `mainnet-beta` | Not yet |

Only Devnet is enabled. The API rejects any other cluster value.

---

## Security

- **No private keys on the server** — the wallet signs a challenge message client-side using its Ed25519 key. The server only sees the signature (64 bytes) and the public key (the wallet address).
- **Challenge expiry** — challenges expire after 5 minutes to prevent replay attacks.
- **One-time use** — each challenge is marked `consumed` after a successful verify. Replay of a consumed challenge returns 409.
- **Domain binding** — challenges are bound to the request's `Host` header. A challenge created on `winscore.app` cannot be verified from `attacker.com`.
- **Race protection** — the verify route uses `eq("consumed", false)` in the update to atomically prevent double-consume.
- **User-scoped** — challenge and link rows are scoped to the authenticated user (`user_id`).
- **Unlink guards** — unlink is refused if the wallet has pending wager intents (`preparing` / `awaiting_signature` / `submitted`), unsettled entries (`confirmed` / `locked`), or pending claims.
