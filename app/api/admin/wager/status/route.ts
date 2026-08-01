import { createSolanaRpc } from "@solana/kit";
import { NextResponse } from "next/server";
import { assertAdmin } from "@/app/api/admin/wager/_admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getWagerEnv } from "@/lib/wager/env";
import { addressFromBytes, deriveVaultAta, deriveWagerRoundPda } from "@/lib/wager/pda";

export const dynamic = "force-dynamic";

function byteaToBytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value.replace(/^\\x/, ""), "hex"));
}

export async function GET(request: Request) {
  const auth = await assertAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("group");
  const roundId = searchParams.get("round");
  if (!groupId || !roundId) {
    return NextResponse.json({ error: "group and round are required" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  const { data: config } = await admin
    .from("group_wager_configs")
    .select("enabled")
    .eq("group_id", groupId)
    .maybeSingle();
  const configEnabled = config?.enabled === true;

  const { data: round } = await admin
    .from("wager_rounds")
    .select(
      "id, state, closes_at, stake_base_units, verified_decimals, approved_mint, approved_token_program",
    )
    .eq("group_id", groupId)
    .eq("round_id", roundId)
    .maybeSingle();
  const wagerRoundExists = !!round;

  let vaultExists = false;
  let closesAt: string | undefined;
  let stakeDisplay: string | undefined;

  if (round) {
    closesAt = round.closes_at;
    stakeDisplay = (Number(round.stake_base_units) / 10 ** round.verified_decimals).toLocaleString(
      undefined,
      { maximumFractionDigits: round.verified_decimals },
    );

    const mint = addressFromBytes(byteaToBytes(round.approved_mint));
    const tokenProgram = addressFromBytes(byteaToBytes(round.approved_token_program));
    const wagerRound = await deriveWagerRoundPda(groupId, roundId);
    const vault = await deriveVaultAta(wagerRound.address, mint, tokenProgram);

    const rpc = createSolanaRpc(getWagerEnv().rpcUrl);
    const info = await rpc.getAccountInfo(vault.address, { encoding: "base64" }).send();
    vaultExists = !!info.value;
  }

  return NextResponse.json(
    {
      configEnabled,
      wagerRoundExists,
      vaultExists,
      closesAt,
      stakeDisplay,
      // The settle panel keys off these: it needs the round's id to call
      // /api/admin/wager/settle, and its state to know whether settling is even
      // a possibility before asking the server for readiness.
      wagerRoundId: round?.id,
      state: round?.state,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
