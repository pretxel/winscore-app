# Decision: External Settlement & Upgrade Signer Handling

**Status:** Accepted
**Date:** 2026-07-22
**Deciders:** Winscore development team

## Context

The wager escrow program requires:
- A **settlement authority** that can invoke `settle` and accept a Merkle root/manifest
- An **upgrade authority** for the on-chain program
- A **wager round authority** for `initialize_wager_round`, `shorten_close`, `cancel_and_refund`

These authorities control value-bearing operations and program upgrades. They must be secured appropriately.

## Decision

1. **Settlement and wager-round authorities** will be held by an **external signer** (not a hot wallet in the application). The MVP runs with a single-party key kept outside the Next.js runtime. The application constructs unsigned transactions and submits them through a separate admin tool or a future multisig integration.

2. **Program upgrade authority** will be set to an address held by the development team. Mainnet deployment is blocked until a **multisig** (e.g., Squads) is configured.

3. **No private keys for authorities** are stored in environment variables, source code, or bundled application assets. The application's `server-only` code handles only public keys and unsigned transaction construction.

4. **Mainnet is structurally blocked** until:
   - A formal multisig configuration is in place (e.g., 2-of-3 or 3-of-5)
   - Legal review confirms operator identity and jurisdiction
   - An independent security audit validates the signer separation

## Consequences

- Devnet MVP uses a single-party signer for operational simplicity; this is acceptable because Devnet funds carry no real value
- Admin settlement operations require an external signing step (CLI tool or admin UI with Wallet Standard)
- Any future Mainnet activation requires a separate change with multisig, legal, and audit gates

## Alternatives Considered

- **Application-held hot wallet**: Rejected. A compromised server could drain escrow or sign fraudulent settlements.
- **Server-side key in environment**: Rejected. Equally vulnerable to server compromise; harder to rotate.
- **DAO governance**: Overkill for MVP. May be appropriate post-Mainnet with a token governance model.
