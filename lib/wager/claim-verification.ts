/**
 * On-chain verification of claim and refund outcomes.
 *
 * A confirmed signature is not proof that the funds moved the way we expect, so
 * these read the resulting account state instead of trusting the client's word or
 * the transaction status alone.
 */

import { address, createSolanaRpc } from "@solana/kit";
import { getWagerEnv } from "./env";

/** Anchor prefixes every account with an 8-byte discriminator. */
const ANCHOR_DISCRIMINATOR_LENGTH = 8;

/**
 * Claim layout after the discriminator: wager_round (32) + winner (32) +
 * amount (u64) + state (1-byte enum) + bump (1).
 */
const CLAIM_STATE_OFFSET = ANCHOR_DISCRIMINATOR_LENGTH + 32 + 32 + 8;
const CLAIM_AMOUNT_OFFSET = ANCHOR_DISCRIMINATOR_LENGTH + 32 + 32;

/** ClaimState discriminants, in declaration order. */
const CLAIM_STATE_PENDING = 0;
const CLAIM_STATE_CLAIMED = 1;

/**
 * Entry layout after the discriminator: wager_round (32) + entrant (32) +
 * pick_commitment (32) + intent_hash (32) + state (1) + …
 */
const ENTRY_STATE_OFFSET = ANCHOR_DISCRIMINATOR_LENGTH + 32 + 32 + 32 + 32;

/** EntryState discriminants, in declaration order. */
const ENTRY_STATE_REFUNDED = 2;

async function fetchAccountData(pubkey: string): Promise<Uint8Array | null> {
  const rpc = createSolanaRpc(getWagerEnv().rpcUrl);
  const { value } = await rpc.getAccountInfo(address(pubkey), { encoding: "base64" }).send();
  if (!value?.data) return null;
  const [base64] = value.data;
  return new Uint8Array(Buffer.from(base64, "base64"));
}

export interface ClaimVerification {
  claimed: boolean;
  /** The amount the program recorded, which may differ from what we expected. */
  amountBaseUnits?: number;
  error?: string;
}

/**
 * Confirm a Claim PDA reached the Claimed state for the expected amount.
 *
 * The amount is checked because it is part of the Merkle leaf: a Claim recording
 * a different figure means the proof that verified was not the one we built.
 */
export async function verifyClaimOnChain(
  claimPda: string,
  expectedAmountBaseUnits: number,
): Promise<ClaimVerification> {
  const data = await fetchAccountData(claimPda);
  if (!data) return { claimed: false, error: "Claim account does not exist" };
  if (data.length < CLAIM_STATE_OFFSET + 1) {
    return { claimed: false, error: "Claim account is too small to decode" };
  }

  const state = data[CLAIM_STATE_OFFSET];
  if (state === CLAIM_STATE_PENDING) {
    return { claimed: false, error: "Claim is still pending on-chain" };
  }
  if (state !== CLAIM_STATE_CLAIMED) {
    return { claimed: false, error: `Unexpected claim state ${state}` };
  }

  const amount = Number(
    Buffer.from(data.slice(CLAIM_AMOUNT_OFFSET, CLAIM_AMOUNT_OFFSET + 8)).readBigUInt64LE(),
  );
  if (amount !== expectedAmountBaseUnits) {
    return {
      claimed: false,
      amountBaseUnits: amount,
      error: `Claim recorded ${amount} base units, expected ${expectedAmountBaseUnits}`,
    };
  }

  return { claimed: true, amountBaseUnits: amount };
}

/** Confirm an Entry PDA reached the Refunded state. */
export async function verifyRefundOnChain(
  entryPda: string,
): Promise<{ refunded: boolean; error?: string }> {
  const data = await fetchAccountData(entryPda);
  if (!data) return { refunded: false, error: "Entry account does not exist" };
  if (data.length < ENTRY_STATE_OFFSET + 1) {
    return { refunded: false, error: "Entry account is too small to decode" };
  }

  const state = data[ENTRY_STATE_OFFSET];
  if (state !== ENTRY_STATE_REFUNDED) {
    return { refunded: false, error: `Entry state is ${state}, not refunded` };
  }

  return { refunded: true };
}
