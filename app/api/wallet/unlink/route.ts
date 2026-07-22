import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: { linkId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { linkId } = body;
  if (!linkId) {
    return NextResponse.json(
      { error: "linkId is required" },
      { status: 400 }
    );
  }

  // Verify link exists and belongs to the user
  const { data: link, error: linkError } = await supabase
    .from("wallet_links")
    .select("*")
    .eq("id", linkId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (linkError || !link) {
    return NextResponse.json(
      { error: "Active link not found" },
      { status: 404 }
    );
  }

  // Check for pending intents that require this wallet
  const { data: pendingIntents } = await supabase
    .from("wager_intents")
    .select("id, state")
    .eq("wallet_link_id", linkId)
    .in("state", ["preparing", "awaiting_signature", "submitted"]);

  if (pendingIntents && pendingIntents.length > 0) {
    return NextResponse.json(
      {
        error: "Cannot unlink: pending wager intents exist",
        pendingIntents: pendingIntents.length,
      },
      { status: 409 }
    );
  }

  // Check for unsettled entries
  const { data: unsettledEntries } = await supabase
    .from("wager_entries")
    .select("id, state")
    .eq("user_id", user.id)
    .in("state", ["confirmed", "locked"]);

  if (unsettledEntries && unsettledEntries.length > 0) {
    return NextResponse.json(
      {
        error: "Cannot unlink: unsettled wager entries exist",
        unsettledEntries: unsettledEntries.length,
      },
      { status: 409 }
    );
  }

  // Check for pending claims
  const { data: pendingClaims } = await supabase
    .from("wager_claims")
    .select("id, state")
    .eq("user_id", user.id)
    .eq("state", "pending");

  if (pendingClaims && pendingClaims.length > 0) {
    return NextResponse.json(
      {
        error: "Cannot unlink: pending claims exist",
        pendingClaims: pendingClaims.length,
      },
      { status: 409 }
    );
  }

  // Deactivate the link
  const { error: updateError } = await supabase
    .from("wallet_links")
    .update({
      is_active: false,
      unlinked_at: new Date().toISOString(),
    })
    .eq("id", linkId)
    .eq("is_active", true);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to unlink wallet" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { ok: true },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
