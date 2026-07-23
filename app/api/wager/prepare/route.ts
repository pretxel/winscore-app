import { createHash } from "node:crypto";
import {
  appendTransactionMessageInstructions,
  compileTransaction,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  type Instruction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
} from "@solana-program/token";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { transitionIntentState } from "@/lib/wager/entry-saga";
import { getWagerEnv } from "@/lib/wager/env";
import { buildEnterInstruction } from "@/lib/wager/instructions";
import {
  addressFromBytes,
  deriveEntryPda,
  deriveVaultAta,
  deriveWagerRoundPda,
} from "@/lib/wager/pda";

export const dynamic = "force-dynamic";

/** Decode a Postgres `bytea` (`\x…` hex string) to raw bytes. */
function byteaToBytes(value: unknown): Uint8Array | null {
  if (typeof value !== "string") return null;
  const hex = value.replace(/^\\x/, "");
  return hex ? new Uint8Array(Buffer.from(hex, "hex")) : null;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = getWagerEnv();
  if (!env.depositsEnabled) {
    return NextResponse.json({ error: "Deposits are currently disabled" }, { status: 403 });
  }

  let body: { intentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { intentId } = body;
  if (!intentId) {
    return NextResponse.json({ error: "intentId is required" }, { status: 400 });
  }

  // Intent must belong to the caller and be in the preparing state.
  const { data: intent } = await supabase
    .from("wager_intents")
    .select("id, group_id, round_id, wager_round_id, wallet_link_id, pick_commitment")
    .eq("id", intentId)
    .eq("user_id", user.id)
    .eq("state", "preparing")
    .single();

  if (!intent) {
    return NextResponse.json(
      { error: "Intent not found or not in preparing state" },
      { status: 404 },
    );
  }
  if (!intent.wager_round_id) {
    return NextResponse.json(
      { error: "Wager round not configured for this round" },
      { status: 409 },
    );
  }

  const admin = createAdminSupabaseClient();

  const { data: round } = await admin
    .from("wager_rounds")
    .select("approved_mint, approved_token_program, stake_base_units")
    .eq("id", intent.wager_round_id)
    .single();

  const { data: link } = await admin
    .from("wallet_links")
    .select("wallet_address")
    .eq("id", intent.wallet_link_id)
    .single();

  const entrantBytes = byteaToBytes(link?.wallet_address);
  const mintBytes = byteaToBytes(round?.approved_mint);
  const tokenProgramBytes = byteaToBytes(round?.approved_token_program);
  const pickCommitment = byteaToBytes(intent.pick_commitment);

  if (!entrantBytes || !mintBytes || !tokenProgramBytes || !pickCommitment) {
    return NextResponse.json({ error: "Wager round or wallet is misconfigured" }, { status: 409 });
  }

  const entrant = addressFromBytes(entrantBytes);
  const mint = addressFromBytes(mintBytes);
  const tokenProgram = addressFromBytes(tokenProgramBytes);
  const stakeBaseUnits = BigInt(round?.stake_base_units ?? 0);

  // Derive on-chain accounts.
  const wagerRound = await deriveWagerRoundPda(intent.group_id, intent.round_id);
  const vault = await deriveVaultAta(wagerRound.address, mint, tokenProgram);
  const entry = await deriveEntryPda(wagerRound.address, entrant);
  const [entrantAta] = await findAssociatedTokenPda({ owner: entrant, mint, tokenProgram });

  const rpc = createSolanaRpc(env.rpcUrl);

  // The vault ATA is created by initialize_wager_round; a missing vault means
  // the round was never initialized on-chain and `enter` would fail opaquely.
  const vaultInfo = await rpc.getAccountInfo(vault.address, { encoding: "base64" }).send();
  if (!vaultInfo.value) {
    return NextResponse.json(
      { error: "Wager round is not initialized on-chain yet" },
      { status: 409 },
    );
  }

  const instructions: Instruction[] = [];

  // Self-heal the entrant's token account if absent.
  const entrantAtaInfo = await rpc.getAccountInfo(entrantAta, { encoding: "base64" }).send();
  if (!entrantAtaInfo.value) {
    instructions.push(
      getCreateAssociatedTokenIdempotentInstruction({
        payer: { address: entrant } as never,
        owner: entrant,
        mint,
        ata: entrantAta,
        tokenProgram,
      }),
    );
  }

  // Opaque 32-byte intent identity — stored on-chain, not validated.
  const intentHash = new Uint8Array(createHash("sha256").update(intentId).digest());

  instructions.push(
    buildEnterInstruction(
      env.programId as never,
      {
        entrant,
        wagerRound: wagerRound.address,
        entry: entry.address,
        entrantTokenAccount: entrantAta,
        vault: vault.address,
        approvedMint: mint,
        tokenProgram,
      },
      { stakeBaseUnits, pickCommitment, intentHash },
    ),
  );

  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: env.commitment }).send();

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(entrant, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );

  const transactionBase64 = getBase64EncodedWireTransaction(compileTransaction(message));

  await transitionIntentState(intentId, "awaiting_signature");

  return NextResponse.json(
    {
      ok: true,
      intentId,
      transactionBase64,
      entryPda: entry.address,
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight.toString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
