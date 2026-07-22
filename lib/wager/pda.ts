import { getWagerEnv } from "./env";
import { base58 } from "@scure/base";
import { createHash } from "crypto";

const PROGRAM_VERSION = 1;

export const WAGER_ROUND_SEED = Buffer.from("wager-round");
export const ENTRY_SEED = Buffer.from("entry");
export const CLAIM_SEED = Buffer.from("claim");

function toBuffer(data: Uint8Array): Buffer {
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}

function sha256(...chunks: Uint8Array[]): Buffer {
  const h = createHash("sha256");
  for (const chunk of chunks) {
    h.update(toBuffer(chunk) as never);
  }
  return h.digest() as never;
}

function sha256v(chunks: Uint8Array[]): Buffer {
  const h = createHash("sha256");
  for (const chunk of chunks) {
    h.update(toBuffer(chunk) as never);
  }
  return h.digest() as never;
}

export function deriveWagerRoundPda(
  groupId: string,
  roundId: string,
): { pda: Uint8Array; bump: number } {
  const groupBytes = Buffer.from(groupId.replace(/-/g, ""), "hex");
  const roundBytes = Buffer.from(roundId.replace(/-/g, ""), "hex");
  return findPda([WAGER_ROUND_SEED, Uint8Array.of(PROGRAM_VERSION), groupBytes, roundBytes]);
}

export function deriveEntryPda(
  wagerRoundPubkey: Uint8Array,
  entrantWalletPubkey: Uint8Array,
): { pda: Uint8Array; bump: number } {
  return findPda([ENTRY_SEED, wagerRoundPubkey, entrantWalletPubkey]);
}

export function deriveClaimPda(
  wagerRoundPubkey: Uint8Array,
  winnerWalletPubkey: Uint8Array,
): { pda: Uint8Array; bump: number } {
  return findPda([CLAIM_SEED, wagerRoundPubkey, winnerWalletPubkey]);
}

export function deriveVaultAta(
  wagerRoundPubkey: Uint8Array,
  mintPubkey: Uint8Array,
  tokenProgramPubkey: Uint8Array,
): Uint8Array {
  const ataProgram = base58.decode("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
  const programDerivedAddress = Buffer.from("ProgramDerivedAddress");

  const baseHash = sha256(wagerRoundPubkey, tokenProgramPubkey, mintPubkey);
  const baseHashWithAta = sha256(
    new Uint8Array(baseHash.buffer, baseHash.byteOffset, baseHash.byteLength),
    ataProgram,
    programDerivedAddress,
  );

  // ATA always uses bump 255 (or find first valid)
  return new Uint8Array(
    baseHashWithAta.buffer,
    baseHashWithAta.byteOffset,
    32,
  );
}

function findPda(seeds: Uint8Array[]): { pda: Uint8Array; bump: number } {
  const programId = base58.decode(getWagerEnv().programId);
  const programDerivedAddress = Buffer.from("ProgramDerivedAddress");

  for (let bump = 255; bump >= 0; bump--) {
    const chunks = [...seeds, Uint8Array.of(bump), programId, programDerivedAddress];
    const pda = sha256v(chunks);
    return { pda: new Uint8Array(pda.buffer, pda.byteOffset, 32), bump };
  }

  throw new Error("Could not find valid PDA bump");
}
