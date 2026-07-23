import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWagerEnv } from "@/lib/wager/env";

export const dynamic = "force-dynamic";

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

  const { data: intent } = await supabase
    .from("wager_intents")
    .select("id")
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

  return NextResponse.json(
    { ok: true, intentId: intent.id },
    { headers: { "Cache-Control": "no-store" } },
  );
}
