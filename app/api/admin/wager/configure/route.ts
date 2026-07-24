import { base58 } from "@scure/base";
import { address, createSolanaRpc } from "@solana/kit";
import { NextResponse } from "next/server";
import { assertAdmin } from "@/app/api/admin/wager/_admin";
import { getWagerEnv } from "@/lib/wager/env";
import { parseMintAccount, stakeToBaseUnits } from "@/lib/wager/mint-account";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await assertAdmin();
  if (!auth.ok) return auth.response;

  let body: { groupId?: string; mint?: string; stakeAmount?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { groupId, mint, stakeAmount } = body;
  if (!groupId || !mint || !stakeAmount) {
    return NextResponse.json(
      { error: "groupId, mint and stakeAmount are required" },
      { status: 400 },
    );
  }

  const env = getWagerEnv();
  const rpc = createSolanaRpc(env.rpcUrl);

  let decimals: number;
  let tokenProgram: string;
  try {
    const info = await rpc.getAccountInfo(address(mint), { encoding: "base64" }).send();
    if (!info.value) {
      return NextResponse.json({ error: "Mint account not found on devnet" }, { status: 400 });
    }
    const rawData = info.value.data;
    const base64Data = Array.isArray(rawData) ? rawData[0] : rawData;
    if (typeof base64Data !== "string") {
      return NextResponse.json({ error: "Unexpected mint account data encoding" }, { status: 400 });
    }
    const data = new Uint8Array(Buffer.from(base64Data, "base64"));
    ({ decimals, tokenProgram } = parseMintAccount(info.value.owner, data));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read mint" },
      { status: 400 },
    );
  }

  let stakeBaseUnits: bigint;
  try {
    stakeBaseUnits = stakeToBaseUnits(stakeAmount, decimals);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid stake" },
      { status: 400 },
    );
  }

  const mintHex = `\\x${Buffer.from(base58.decode(mint)).toString("hex")}`;
  const tokenProgramHex = `\\x${Buffer.from(base58.decode(tokenProgram)).toString("hex")}`;

  const { data: configId, error } = await auth.supabase.rpc("configure_pool_wager", {
    p_group_id: groupId,
    p_approved_mint: mintHex,
    p_approved_token_program: tokenProgramHex,
    p_verified_decimals: decimals,
    // Postgres column is `numeric`; send as a string so PostgREST parses it
    // exactly instead of round-tripping through a JS `number` and losing
    // precision above Number.MAX_SAFE_INTEGER. Generated types say `number`
    // because Supabase maps `numeric` args that way, but strings are valid.
    p_stake_base_units: stakeBaseUnits.toString() as unknown as number,
    p_cluster: "devnet",
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(
    { ok: true, configId, decimals, tokenProgram },
    { headers: { "Cache-Control": "no-store" } },
  );
}
