import { type Address, type Instruction } from "@solana/kit";
import { getWagerEnv } from "@/lib/wager/env";
import { buildInitializeWagerRoundInstruction } from "@/lib/wager/instructions";
import { deriveVaultAta, deriveWagerRoundPda } from "@/lib/wager/pda";

const REFUND_TIMEOUT_SECONDS = BigInt(172_800); // 48h
const MAX_PARTICIPANTS = 1000;
const MAX_TOTAL_STAKE = BigInt(1_000_000_000_000);

function uuidToBytes(uuid: string): Uint8Array {
  return Uint8Array.from(Buffer.from(uuid.replace(/-/g, ""), "hex"));
}

export interface InitRoundParams {
  groupId: string;
  roundId: string;
  mint: string;
  tokenProgram: string;
  authority: string;
  settlementAuthority: string;
  closesAt: bigint;
}

/** Build the on-chain initialize_wager_round instruction + derived accounts. */
export async function buildInitRoundInstruction(
  params: InitRoundParams,
): Promise<{ instruction: Instruction; wagerRound: string; vault: string }> {
  const mint = params.mint as Address;
  const tokenProgram = params.tokenProgram as Address;
  const authority = params.authority as Address;

  const wagerRound = await deriveWagerRoundPda(params.groupId, params.roundId);
  const vault = await deriveVaultAta(wagerRound.address, mint, tokenProgram);

  const instruction = buildInitializeWagerRoundInstruction(
    getWagerEnv().programId as Address,
    {
      authority,
      wagerRound: wagerRound.address,
      approvedMint: mint,
      vault: vault.address,
      rentRecipientA: authority,
      rentRecipientB: authority,
      tokenProgram,
    },
    {
      groupId: uuidToBytes(params.groupId),
      roundId: uuidToBytes(params.roundId),
      closesAt: params.closesAt,
      refundTimeout: REFUND_TIMEOUT_SECONDS,
      maxParticipants: MAX_PARTICIPANTS,
      maxTotalStake: MAX_TOTAL_STAKE,
      settlementAuthority: params.settlementAuthority as Address,
    },
  );

  return { instruction, wagerRound: wagerRound.address, vault: vault.address };
}
