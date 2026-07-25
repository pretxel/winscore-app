/**
 * Hand-built @solana/kit instructions for the winscore-wager program.
 *
 * Covers the full round lifecycle: `initialize_wager_round`, `enter`, `lock`,
 * `settle`, `claim`, `cancel_and_refund`, and `refund`. Discriminators and
 * account/arg layouts are transcribed from
 * `solana/winscore-wager/target/idl/winscore_wager.json` and pinned by unit
 * tests, which is cheaper than wiring up a generated client (codama).
 *
 * `close` and `shorten_close` are deliberately absent: neither is on a user or
 * settlement path, and rent reclamation is a manual operator action.
 */

import {
  AccountRole,
  type Address,
  fixEncoderSize,
  getAddressEncoder,
  getArrayEncoder,
  getBytesEncoder,
  getI64Encoder,
  getStructEncoder,
  getU16Encoder,
  getU64Encoder,
  type Instruction,
  type ReadonlyUint8Array,
} from "@solana/kit";

export const SYSTEM_PROGRAM_ADDRESS = "11111111111111111111111111111111" as Address;
export const TOKEN_PROGRAM_ADDRESS = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as Address;
export const ASSOCIATED_TOKEN_PROGRAM_ADDRESS =
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" as Address;

export const ENTER_DISCRIMINATOR = Uint8Array.from([139, 49, 209, 114, 88, 91, 77, 134]);
export const INITIALIZE_WAGER_ROUND_DISCRIMINATOR = Uint8Array.from([
  33, 19, 81, 247, 56, 249, 125, 217,
]);
export const LOCK_DISCRIMINATOR = Uint8Array.from([21, 19, 208, 43, 237, 62, 255, 87]);
export const SETTLE_DISCRIMINATOR = Uint8Array.from([175, 42, 185, 87, 144, 131, 102, 212]);
export const CLAIM_DISCRIMINATOR = Uint8Array.from([62, 198, 214, 193, 213, 159, 108, 210]);
export const CANCEL_AND_REFUND_DISCRIMINATOR = Uint8Array.from([86, 34, 75, 82, 239, 186, 2, 228]);
export const REFUND_DISCRIMINATOR = Uint8Array.from([2, 96, 183, 251, 63, 208, 46, 46]);

const bytes16 = fixEncoderSize(getBytesEncoder(), 16);
const bytes32 = fixEncoderSize(getBytesEncoder(), 32);

function prependDiscriminator(discriminator: Uint8Array, body: ReadonlyUint8Array): Uint8Array {
  const out = new Uint8Array(discriminator.length + body.length);
  out.set(discriminator, 0);
  out.set(body, discriminator.length);
  return out;
}

// ---------------------------------------------------------------------------
// enter
// ---------------------------------------------------------------------------

export interface EnterAccounts {
  entrant: Address;
  wagerRound: Address;
  entry: Address;
  entrantTokenAccount: Address;
  vault: Address;
  approvedMint: Address;
  tokenProgram?: Address;
}

export interface EnterArgs {
  stakeBaseUnits: bigint;
  /** 32-byte pick commitment hash. */
  pickCommitment: Uint8Array;
  /** 32-byte opaque intent identity (stored on-chain, not validated). */
  intentHash: Uint8Array;
}

const enterArgsEncoder = getStructEncoder([
  ["stakeBaseUnits", getU64Encoder()],
  ["pickCommitment", bytes32],
  ["intentHash", bytes32],
]);

export function buildEnterInstruction(
  programId: Address,
  accounts: EnterAccounts,
  args: EnterArgs,
): Instruction {
  const data = prependDiscriminator(ENTER_DISCRIMINATOR, enterArgsEncoder.encode(args));
  return {
    programAddress: programId,
    accounts: [
      { address: accounts.entrant, role: AccountRole.WRITABLE_SIGNER },
      { address: accounts.wagerRound, role: AccountRole.WRITABLE },
      { address: accounts.entry, role: AccountRole.WRITABLE },
      { address: accounts.entrantTokenAccount, role: AccountRole.WRITABLE },
      { address: accounts.vault, role: AccountRole.WRITABLE },
      { address: accounts.approvedMint, role: AccountRole.READONLY },
      { address: accounts.tokenProgram ?? TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data,
  };
}

// ---------------------------------------------------------------------------
// initialize_wager_round
// ---------------------------------------------------------------------------

export interface InitializeWagerRoundAccounts {
  authority: Address;
  wagerRound: Address;
  approvedMint: Address;
  vault: Address;
  rentRecipientA: Address;
  rentRecipientB: Address;
  tokenProgram?: Address;
}

export interface InitializeWagerRoundArgs {
  /** 16 raw bytes of the group UUID. */
  groupId: Uint8Array;
  /** 16 raw bytes of the round UUID. */
  roundId: Uint8Array;
  closesAt: bigint;
  refundTimeout: bigint;
  maxParticipants: number;
  maxTotalStake: bigint;
  settlementAuthority: Address;
}

const initializeArgsEncoder = getStructEncoder([
  ["groupId", bytes16],
  ["roundId", bytes16],
  ["closesAt", getI64Encoder()],
  ["refundTimeout", getI64Encoder()],
  ["maxParticipants", getU16Encoder()],
  ["maxTotalStake", getU64Encoder()],
  ["settlementAuthority", getAddressEncoder()],
]);

export function buildInitializeWagerRoundInstruction(
  programId: Address,
  accounts: InitializeWagerRoundAccounts,
  args: InitializeWagerRoundArgs,
): Instruction {
  const data = prependDiscriminator(
    INITIALIZE_WAGER_ROUND_DISCRIMINATOR,
    initializeArgsEncoder.encode(args),
  );
  return {
    programAddress: programId,
    accounts: [
      { address: accounts.authority, role: AccountRole.WRITABLE_SIGNER },
      { address: accounts.wagerRound, role: AccountRole.WRITABLE },
      { address: accounts.approvedMint, role: AccountRole.READONLY },
      { address: accounts.vault, role: AccountRole.WRITABLE },
      { address: accounts.rentRecipientA, role: AccountRole.READONLY },
      { address: accounts.rentRecipientB, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: accounts.tokenProgram ?? TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: ASSOCIATED_TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data,
  };
}

// ---------------------------------------------------------------------------
// lock
// ---------------------------------------------------------------------------

/**
 * Permissionless once the on-chain clock passes `closes_at`: the round takes no
 * signer, so anyone can push Initialized → Locked. No args.
 */
export function buildLockInstruction(programId: Address, wagerRound: Address): Instruction {
  return {
    programAddress: programId,
    accounts: [{ address: wagerRound, role: AccountRole.WRITABLE }],
    data: LOCK_DISCRIMINATOR,
  };
}

// ---------------------------------------------------------------------------
// settle
// ---------------------------------------------------------------------------

export interface SettleAccounts {
  settlementAuthority: Address;
  wagerRound: Address;
  vault: Address;
}

export interface SettleArgs {
  /** 32-byte hash of the canonical settlement manifest. */
  manifestHash: Uint8Array;
  /** 32-byte Merkle root over the winner claim leaves. */
  merkleRoot: Uint8Array;
  winnerCount: number;
  /** Must equal the vault's token balance, or the program rejects the settle. */
  totalDistributable: bigint;
}

const settleArgsEncoder = getStructEncoder([
  ["manifestHash", bytes32],
  ["merkleRoot", bytes32],
  ["winnerCount", getU16Encoder()],
  ["totalDistributable", getU64Encoder()],
]);

export function buildSettleInstruction(
  programId: Address,
  accounts: SettleAccounts,
  args: SettleArgs,
): Instruction {
  const data = prependDiscriminator(SETTLE_DISCRIMINATOR, settleArgsEncoder.encode(args));
  return {
    programAddress: programId,
    accounts: [
      // The settlement authority signs but pays nothing, so it is a non-writable
      // signer — unlike the fee-paying authority on initialize.
      { address: accounts.settlementAuthority, role: AccountRole.READONLY_SIGNER },
      { address: accounts.wagerRound, role: AccountRole.WRITABLE },
      { address: accounts.vault, role: AccountRole.READONLY },
    ],
    data,
  };
}

// ---------------------------------------------------------------------------
// claim
// ---------------------------------------------------------------------------

export interface ClaimAccounts {
  winner: Address;
  wagerRound: Address;
  claim: Address;
  vault: Address;
  winnerTokenAccount: Address;
  tokenProgram?: Address;
}

export interface ClaimArgs {
  /** Award in base units; part of the Merkle leaf, so it must match exactly. */
  amount: bigint;
  /** Sibling hashes from leaf to root. Empty when the winner is the only leaf. */
  proof: Uint8Array[];
}

// Anchor serializes `Vec<[u8; 32]>` as a u32 length prefix followed by the
// elements, which is what getArrayEncoder emits by default.
const claimArgsEncoder = getStructEncoder([
  ["amount", getU64Encoder()],
  ["proof", getArrayEncoder(bytes32)],
]);

export function buildClaimInstruction(
  programId: Address,
  accounts: ClaimAccounts,
  args: ClaimArgs,
): Instruction {
  const data = prependDiscriminator(CLAIM_DISCRIMINATOR, claimArgsEncoder.encode(args));
  return {
    programAddress: programId,
    accounts: [
      { address: accounts.winner, role: AccountRole.WRITABLE_SIGNER },
      { address: accounts.wagerRound, role: AccountRole.WRITABLE },
      { address: accounts.claim, role: AccountRole.WRITABLE },
      { address: accounts.vault, role: AccountRole.WRITABLE },
      { address: accounts.winnerTokenAccount, role: AccountRole.WRITABLE },
      { address: accounts.tokenProgram ?? TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data,
  };
}

// ---------------------------------------------------------------------------
// cancel_and_refund
// ---------------------------------------------------------------------------

/**
 * Moves a not-yet-settled round to Cancelled, which is what unlocks per-entrant
 * `refund`. The round authority may call it at any time; anyone may call it once
 * `closes_at + refund_timeout` has elapsed. No args.
 */
export function buildCancelAndRefundInstruction(
  programId: Address,
  accounts: { caller: Address; wagerRound: Address },
): Instruction {
  return {
    programAddress: programId,
    accounts: [
      { address: accounts.caller, role: AccountRole.WRITABLE_SIGNER },
      { address: accounts.wagerRound, role: AccountRole.WRITABLE },
    ],
    data: CANCEL_AND_REFUND_DISCRIMINATOR,
  };
}

// ---------------------------------------------------------------------------
// refund
// ---------------------------------------------------------------------------

export interface RefundAccounts {
  entrant: Address;
  wagerRound: Address;
  entry: Address;
  vault: Address;
  entrantTokenAccount: Address;
  tokenProgram?: Address;
}

/**
 * Entrant pulls their exact stake back from a Cancelled round. The amount comes
 * from the on-chain Entry account, so there are no args to get wrong.
 */
export function buildRefundInstruction(programId: Address, accounts: RefundAccounts): Instruction {
  return {
    programAddress: programId,
    accounts: [
      { address: accounts.entrant, role: AccountRole.WRITABLE_SIGNER },
      { address: accounts.wagerRound, role: AccountRole.READONLY },
      { address: accounts.entry, role: AccountRole.WRITABLE },
      { address: accounts.vault, role: AccountRole.WRITABLE },
      { address: accounts.entrantTokenAccount, role: AccountRole.WRITABLE },
      { address: accounts.tokenProgram ?? TOKEN_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data: REFUND_DISCRIMINATOR,
  };
}
