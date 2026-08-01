import { base58 } from "@scure/base";
import {
  address,
  appendTransactionMessageInstructions,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { NextResponse } from "next/server";
import { assertAdmin } from "@/app/api/admin/wager/_admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { loadWagerAuthoritySigner } from "@/lib/wager/authority";
import { getWagerEnv } from "@/lib/wager/env";
import { buildInitRoundInstruction } from "@/lib/wager/init-round";
import { rateLimitGuard } from "@/lib/wager/rate-limit-guard";

export const dynamic = "force-dynamic";

const POLL_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function byteaToBase58(value: string): string {
  return base58.encode(new Uint8Array(Buffer.from(value.replace(/^\\x/, ""), "hex")));
}

export async function POST(request: Request) {
  const auth = await assertAdmin();
  if (!auth.ok) return auth.response;

  let body: { groupId?: string; roundId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { groupId, roundId } = body;
  if (!groupId || !roundId) {
    return NextResponse.json({ error: "groupId and roundId are required" }, { status: 400 });
  }

  const limited = await rateLimitGuard(auth.userId, "wager_init");
  if (limited) return limited;

  // Create (or no-op) the DB wager_round row.
  const { error: rpcError } = await auth.supabase.rpc("initialize_wager_round", {
    p_group_id: groupId,
    p_round_id: roundId,
  });
  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { data: round } = await admin
    .from("wager_rounds")
    .select("approved_mint, approved_token_program, closes_at")
    .eq("group_id", groupId)
    .eq("round_id", roundId)
    .single();
  if (!round) {
    return NextResponse.json({ error: "Wager round row missing after RPC" }, { status: 500 });
  }

  const env = getWagerEnv();
  const mint = byteaToBase58(round.approved_mint as string);
  const tokenProgram = byteaToBase58(round.approved_token_program as string);
  const closesAt = BigInt(Math.floor(new Date(round.closes_at as string).getTime() / 1000));

  let authority: Awaited<ReturnType<typeof loadWagerAuthoritySigner>>;
  try {
    authority = await loadWagerAuthoritySigner();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Authority keypair error" },
      { status: 500 },
    );
  }
  const settlementAuthority = process.env.WAGER_SETTLEMENT_AUTHORITY ?? authority.address;

  const { instruction, wagerRound, vault } = await buildInitRoundInstruction({
    groupId,
    roundId,
    mint,
    tokenProgram,
    authority: authority.address,
    settlementAuthority,
    closesAt,
  });

  const rpc = createSolanaRpc(env.rpcUrl);

  // Idempotency: if the round PDA already exists, treat as already initialized.
  const existing = await rpc.getAccountInfo(address(wagerRound), { encoding: "base64" }).send();
  if (existing.value) {
    return NextResponse.json({ ok: true, wagerRound, vault, alreadyInitialized: true });
  }

  try {
    const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(authority, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
      (m) => appendTransactionMessageInstructions([instruction], m),
    );
    const signed = await signTransactionMessageWithSigners(message);
    const signature = getSignatureFromTransaction(signed);
    await rpc
      .sendTransaction(getBase64EncodedWireTransaction(signed), {
        encoding: "base64",
        preflightCommitment: "confirmed",
      })
      .send();

    // Poll the signature status until it confirms (or fails), mirroring
    // app/api/wager/submit/route.ts.
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
      const { value } = await rpc
        .getSignatureStatuses([signature], { searchTransactionHistory: true })
        .send();
      const status = value[0];

      if (status) {
        if (status.err) {
          return NextResponse.json({ error: "On-chain init failed on-chain" }, { status: 502 });
        }

        const confirmed =
          status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized";
        if (confirmed) {
          return NextResponse.json(
            { ok: true, wagerRound, vault, signature, alreadyInitialized: false, confirmed: true },
            { headers: { "Cache-Control": "no-store" } },
          );
        }
      }

      if (attempt < POLL_ATTEMPTS - 1) await sleep(POLL_INTERVAL_MS);
    }

    // Not confirmed within the window — submitted but caller should verify via status.
    return NextResponse.json(
      { ok: true, wagerRound, vault, signature, alreadyInitialized: false, confirmed: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "On-chain init failed" },
      { status: 502 },
    );
  }
}
