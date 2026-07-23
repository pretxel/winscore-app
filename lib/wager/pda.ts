import {
  type Address,
  address,
  getAddressDecoder,
  getAddressEncoder,
  getProgramDerivedAddress,
  getUtf8Encoder,
} from "@solana/kit";
import { findAssociatedTokenPda } from "@solana-program/token";
import { getWagerEnv } from "./env";

const PROGRAM_VERSION = 1;

const addressEncoder = getAddressEncoder();
const addressDecoder = getAddressDecoder();
const utf8Encoder = getUtf8Encoder();

export const WAGER_ROUND_SEED = "wager-round";
export const ENTRY_SEED = "entry";
export const CLAIM_SEED = "claim";

/** A derived program address in both its base58 (`address`) and raw 32-byte (`bytes`) forms. */
export interface DerivedPda {
  address: Address;
  bytes: Uint8Array;
  bump: number;
}

/** Convert a UUID string to its 16 raw bytes (dashes stripped). */
function uuidToBytes(uuid: string): Uint8Array {
  return Uint8Array.from(Buffer.from(uuid.replace(/-/g, ""), "hex"));
}

/** 32-byte form of an address, for merkle hashing and `bytea` columns. */
function toBytes(addr: Address): Uint8Array {
  return new Uint8Array(addressEncoder.encode(addr));
}

/** Interpret 32 raw bytes as an address. */
export function addressFromBytes(bytes: Uint8Array): Address {
  return addressDecoder.decode(bytes);
}

function programAddress(): Address {
  return address(getWagerEnv().programId);
}

export async function deriveWagerRoundPda(groupId: string, roundId: string): Promise<DerivedPda> {
  const [addr, bump] = await getProgramDerivedAddress({
    programAddress: programAddress(),
    seeds: [
      utf8Encoder.encode(WAGER_ROUND_SEED),
      Uint8Array.of(PROGRAM_VERSION),
      uuidToBytes(groupId),
      uuidToBytes(roundId),
    ],
  });
  return { address: addr, bytes: toBytes(addr), bump };
}

export async function deriveEntryPda(
  wagerRound: Address,
  entrant: Address,
): Promise<DerivedPda> {
  const [addr, bump] = await getProgramDerivedAddress({
    programAddress: programAddress(),
    seeds: [utf8Encoder.encode(ENTRY_SEED), addressEncoder.encode(wagerRound), addressEncoder.encode(entrant)],
  });
  return { address: addr, bytes: toBytes(addr), bump };
}

export async function deriveClaimPda(
  wagerRound: Address,
  winner: Address,
): Promise<DerivedPda> {
  const [addr, bump] = await getProgramDerivedAddress({
    programAddress: programAddress(),
    seeds: [utf8Encoder.encode(CLAIM_SEED), addressEncoder.encode(wagerRound), addressEncoder.encode(winner)],
  });
  return { address: addr, bytes: toBytes(addr), bump };
}

/** The round's vault is the Associated Token Account owned by the wager-round PDA. */
export async function deriveVaultAta(
  wagerRound: Address,
  mint: Address,
  tokenProgram: Address,
): Promise<DerivedPda> {
  const [addr, bump] = await findAssociatedTokenPda({
    owner: wagerRound,
    mint,
    tokenProgram,
  });
  return { address: addr, bytes: toBytes(addr), bump };
}
