/**
 * Pure verification of a confirmed on-chain `enter` transaction.
 *
 * Given a `getTransaction` (jsonParsed) result and the values the server
 * expects, this proves the deposit actually happened: the wager program was
 * invoked, the correct accounts participated, the instruction data matches the
 * intent (stake, pick commitment, intent hash), and the vault balance grew by
 * the stake. No trust is placed in client-supplied fields.
 */

import { base58 } from "@scure/base";
import { ENTER_DISCRIMINATOR } from "@/lib/wager/instructions";

export interface ExpectedEnter {
  programId: string;
  entrant: string;
  wagerRound: string;
  entry: string;
  vault: string;
  stakeBaseUnits: bigint;
  /** 32-byte pick commitment recorded on the intent. */
  pickCommitment: Uint8Array;
  /** 32-byte sha256(intentId). */
  intentHash: Uint8Array;
}

export interface EnterVerification {
  verified: boolean;
  blockSlot?: number;
  error?: string;
}

// Shapes are `unknown` from RPC JSON; helpers below narrow defensively.
type Json = Record<string, unknown>;

function asObject(value: unknown): Json | null {
  return value && typeof value === "object" ? (value as Json) : null;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Decode a little-endian u64 from `bytes` starting at `offset`. */
function readU64LE(bytes: Uint8Array, offset: number): bigint {
  let value = 0n;
  for (let i = 0; i < 8; i++) {
    value += BigInt(bytes[offset + i]) << BigInt(8 * i);
  }
  return value;
}

/**
 * Verify a confirmed `enter` transaction against expected values.
 * Returns `verified: false` with a specific `error` on any mismatch.
 */
export function verifyConfirmedEnter(
  txResult: unknown,
  expected: ExpectedEnter,
): EnterVerification {
  const tx = asObject(txResult);
  if (!tx) return { verified: false, error: "Transaction not found on chain" };

  const meta = asObject(tx.meta);
  if (!meta) return { verified: false, error: "Transaction meta missing" };
  if (meta.err != null) {
    return { verified: false, error: `Transaction failed: ${JSON.stringify(meta.err)}` };
  }

  const message = asObject(asObject(tx.transaction)?.message);
  const instructions = message?.instructions;
  if (!Array.isArray(instructions)) {
    return { verified: false, error: "Transaction instructions missing" };
  }

  // Locate the wager program instruction (jsonParsed leaves unknown programs raw).
  const enterIx = instructions.map(asObject).find((ix) => ix?.programId === expected.programId);
  if (!enterIx) {
    return { verified: false, error: "Wager program instruction not present" };
  }

  const accounts = enterIx.accounts;
  if (!Array.isArray(accounts)) {
    return { verified: false, error: "Instruction accounts missing" };
  }
  const accountSet = new Set(accounts.map((a) => String(a)));
  for (const [label, addr] of [
    ["entrant", expected.entrant],
    ["wagerRound", expected.wagerRound],
    ["entry", expected.entry],
    ["vault", expected.vault],
  ] as const) {
    if (!accountSet.has(addr)) {
      return { verified: false, error: `Instruction missing ${label} account` };
    }
  }

  // Decode and validate the instruction data.
  if (typeof enterIx.data !== "string") {
    return { verified: false, error: "Instruction data missing" };
  }
  let data: Uint8Array;
  try {
    data = base58.decode(enterIx.data);
  } catch {
    return { verified: false, error: "Instruction data is not valid base58" };
  }
  // discriminator(8) + stake u64(8) + pickCommitment(32) + intentHash(32)
  if (data.length < 80) {
    return { verified: false, error: "Instruction data too short" };
  }
  if (!bytesEqual(data.slice(0, 8), ENTER_DISCRIMINATOR)) {
    return { verified: false, error: "Instruction is not `enter`" };
  }
  if (readU64LE(data, 8) !== expected.stakeBaseUnits) {
    return { verified: false, error: "Stake amount mismatch" };
  }
  if (!bytesEqual(data.slice(16, 48), expected.pickCommitment)) {
    return { verified: false, error: "Pick commitment mismatch" };
  }
  if (!bytesEqual(data.slice(48, 80), expected.intentHash)) {
    return { verified: false, error: "Intent hash mismatch" };
  }

  // Confirm the vault token balance grew by exactly the stake.
  const balanceDelta = vaultBalanceDelta(meta, expected.wagerRound);
  if (balanceDelta === null) {
    return { verified: false, error: "Vault token balance not observable" };
  }
  if (balanceDelta !== expected.stakeBaseUnits) {
    return { verified: false, error: "Vault balance delta does not match stake" };
  }

  const slot = tx.slot;
  return { verified: true, blockSlot: typeof slot === "number" ? slot : 0 };
}

/** Post minus pre token balance for the account owned by the wager-round PDA. */
function vaultBalanceDelta(meta: Json, vaultOwner: string): bigint | null {
  const amountFor = (list: unknown): bigint | null => {
    if (!Array.isArray(list)) return null;
    const match = list.map(asObject).find((b) => b?.owner === vaultOwner);
    if (!match) return null;
    const amount = asObject(match.uiTokenAmount)?.amount;
    return typeof amount === "string" ? BigInt(amount) : null;
  };

  const post = amountFor(meta.postTokenBalances);
  if (post === null) return null;
  const pre = amountFor(meta.preTokenBalances) ?? 0n;
  return post - pre;
}
