import { verifyAsync } from "@noble/ed25519";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    challengeId?: string;
    signature?: number[];
    walletAddress?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { challengeId, signature, walletAddress } = body;

  if (!challengeId || !signature || !walletAddress) {
    return NextResponse.json(
      { error: "challengeId, signature, and walletAddress are required" },
      { status: 400 },
    );
  }

  // Convert signature array back to Uint8Array (64 bytes)
  const sigBytes = new Uint8Array(signature);
  if (sigBytes.length !== 64) {
    return NextResponse.json({ error: "Invalid signature length" }, { status: 400 });
  }

  // Fetch challenge and lock it
  const { data: challenge, error: fetchError } = await supabase
    .from("wallet_link_challenges")
    .select("*")
    .eq("id", challengeId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  // Check expiry
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Challenge expired" }, { status: 410 });
  }

  // Check not already consumed
  if (challenge.consumed) {
    return NextResponse.json({ error: "Challenge already used" }, { status: 409 });
  }

  // Verify domain and cluster match
  const domain = request.headers.get("host") ?? "localhost";
  if (challenge.domain !== domain) {
    return NextResponse.json({ error: "Domain mismatch" }, { status: 403 });
  }

  // Decode wallet address from Base58 to bytes for comparison
  let walletBytes: Uint8Array;
  try {
    const { base58 } = await import("@scure/base");
    walletBytes = base58.decode(walletAddress);
    if (walletBytes.length !== 32) {
      throw new Error("Invalid address length");
    }
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  // Verify stored wallet matches provided wallet
  const storedWallet = new Uint8Array(challenge.wallet_address as unknown as ArrayBuffer);
  if (Buffer.from(walletBytes).compare(Buffer.from(storedWallet)) !== 0) {
    return NextResponse.json({ error: "Wallet address mismatch" }, { status: 403 });
  }

  // Reconstruct the exact message that was signed
  const expectedMessage = challenge.message_text as string;

  // Verify Ed25519 signature
  const messageBytes = new TextEncoder().encode(expectedMessage);
  const pubkeyBytes = walletBytes;

  let isValid: boolean;
  try {
    isValid = await verifyAsync(sigBytes, messageBytes, pubkeyBytes);
  } catch {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 403 });
  }

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // Atomically mark challenge consumed
  const { error: consumeError } = await supabase
    .from("wallet_link_challenges")
    .update({ consumed: true })
    .eq("id", challengeId)
    .eq("consumed", false);

  if (consumeError) {
    return NextResponse.json({ error: "Challenge already consumed (race)" }, { status: 409 });
  }

  // Check for existing active link with this wallet (different user)
  const { data: existingLink } = await supabase
    .from("wallet_links")
    .select("id, user_id")
    .eq("wallet_address", Buffer.from(walletBytes) as unknown as string)
    .eq("is_active", true)
    .maybeSingle();

  if (existingLink && existingLink.user_id !== user.id) {
    return NextResponse.json({ error: "Wallet already linked to another user" }, { status: 409 });
  }

  // Deactivate any previous links for this user
  await supabase
    .from("wallet_links")
    .update({ is_active: false, unlinked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("is_active", true);

  // Create the link
  const { data: link, error: linkError } = await supabase
    .from("wallet_links")
    .insert({
      user_id: user.id,
      wallet_address: `\\x${Buffer.from(walletBytes).toString("hex")}`,
      challenge_id: challengeId,
      signature_bytes: `\\x${Buffer.from(sigBytes).toString("hex")}`,
      cluster: challenge.cluster,
      is_active: true,
      linked_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (linkError) {
    return NextResponse.json({ error: "Failed to create wallet link" }, { status: 500 });
  }

  return NextResponse.json(
    {
      linkId: link.id,
      walletAddress,
      cluster: challenge.cluster,
    },
    {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
