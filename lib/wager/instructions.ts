/**
 * Hand-built @solana/kit instructions for the winscore-wager program.
 *
 * Only the two instructions on the deposit critical path are implemented
 * (`enter`, `initialize_wager_round`). Discriminators and account/arg layouts
 * are transcribed from `solana/winscore-wager/target/idl/winscore_wager.json`
 * and pinned by unit tests. Adding a generated client (codama) is not worth it
 * for two instructions.
 */

import {
  AccountRole,
  type Address,
  fixEncoderSize,
  getAddressEncoder,
  getBytesEncoder,
  getI64Encoder,
  getStructEncoder,
  getU16Encoder,
  getU64Encoder,
  type IInstruction,
} from "@solana/kit";

export const SYSTEM_PROGRAM_ADDRESS = "11111111111111111111111111111111" as Address;
export const TOKEN_PROGRAM_ADDRESS = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as Address;
export const ASSOCIATED_TOKEN_PROGRAM_ADDRESS =
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" as Address;

export const ENTER_DISCRIMINATOR = Uint8Array.from([139, 49, 209, 114, 88, 91, 77, 134]);
export const INITIALIZE_WAGER_ROUND_DISCRIMINATOR = Uint8Array.from([
  33, 19, 81, 247, 56, 249, 125, 217,
]);

const bytes16 = fixEncoderSize(getBytesEncoder(), 16);
const bytes32 = fixEncoderSize(getBytesEncoder(), 32);

function prependDiscriminator(discriminator: Uint8Array, body: ReadonlyUint8Array): Uint8Array {
  const out = new Uint8Array(discriminator.length + body.length);
  out.set(discriminator, 0);
  out.set(body, discriminator.length);
  return out;
}

// `ReadonlyUint8Array` is what kit encoders return; alias it locally.
type ReadonlyUint8Array = Uint8Array | Readonly<Uint8Array>;

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
): IInstruction {
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
): IInstruction {
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
