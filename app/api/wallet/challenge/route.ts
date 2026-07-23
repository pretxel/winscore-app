import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildChallengeParams, formatChallengeMessage } from "@/lib/wallet/challenge";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { walletAddress?: string; cluster?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const walletAddressBase58 = body.walletAddress;
  const cluster = body.cluster ?? "devnet";

  if (!walletAddressBase58 || typeof walletAddressBase58 !== "string") {
    return NextResponse.json({ error: "walletAddress is required" }, { status: 400 });
  }

  if (cluster !== "devnet") {
    return NextResponse.json({ error: "Only devnet is supported" }, { status: 400 });
  }

  const domain = request.headers.get("host") ?? "localhost";

  const params = buildChallengeParams(domain, user.id, walletAddressBase58, cluster);
  const messageText = formatChallengeMessage(params);

  // Decode Base58 wallet address to raw bytes for DB storage
  let walletBytes: Uint8Array;
  try {
    const { base58 } = await import("@scure/base");
    walletBytes = base58.decode(walletAddressBase58);
    if (walletBytes.length !== 32) {
      throw new Error("Invalid address length");
    }
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  // Persist challenge
  const { data: challenge, error } = await supabase
    .from("wallet_link_challenges")
    .insert({
      user_id: user.id,
      wallet_address: Buffer.from(walletBytes) as unknown as string,
      domain: params.domain,
      cluster: params.cluster,
      nonce: Buffer.from(params.nonce) as unknown as string,
      message_text: messageText,
      issued_at: params.issuedAt.toISOString(),
      expires_at: params.expiresAt.toISOString(),
    })
    .select("id, message_text")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create challenge" }, { status: 500 });
  }

  return NextResponse.json(
    {
      challengeId: challenge.id,
      message: messageText,
      expiresAt: params.expiresAt.toISOString(),
    },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
