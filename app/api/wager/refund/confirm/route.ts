import { base58 } from "@scure/base";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireBytea } from "@/lib/wager/bytea";
import { verifyRefundOnChain } from "@/lib/wager/claim-verification";

export const dynamic = "force-dynamic";

/**
 * Records an entry as refunded after proving it on chain. Like the claim
 * confirmation, the Entry PDA is authoritative, so this is idempotent and safe
 * to miss.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { entryId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.entryId) {
    return NextResponse.json({ error: "entryId is required" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: entry } = await admin
    .from("wager_entries")
    .select("id, state, entry_pda")
    .eq("id", body.entryId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }
  if (entry.state === "refunded") {
    return NextResponse.json({ ok: true, state: "refunded", alreadyRecorded: true });
  }

  const verification = await verifyRefundOnChain(
    base58.encode(requireBytea(entry.entry_pda, 32, "entry_pda")),
  );

  if (!verification.refunded) {
    return NextResponse.json(
      { error: verification.error ?? "Refund is not confirmed on-chain", state: entry.state },
      { status: 422 },
    );
  }

  const { error } = await admin
    .from("wager_entries")
    .update({ state: "refunded" })
    .eq("id", entry.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, state: "refunded" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
