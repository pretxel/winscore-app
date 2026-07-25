import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { recordRun } from "@/lib/operations/record-run";
import { isOperationEnabled } from "@/lib/operations/settings";
import { getWagerEnv } from "@/lib/wager/env";
import { reconcileWagerEntries } from "@/lib/wager/reconciler";

function unauthorized() {
  return new NextResponse("unauthorized", { status: 401 });
}

function skipped(reason: string) {
  return new NextResponse(null, {
    status: 204,
    headers: { "x-skipped": reason },
  });
}

/**
 * Converges wager intents whose confirmation was never observed — a lost
 * callback, a closed tab, a submit that timed out mid-poll. Without this a user
 * who paid on chain would keep an entry stuck in `submitted` forever.
 *
 * Runs on the deposit flag rather than the settlement flag: entries can be left
 * dangling by the deposit path alone.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const isProd = process.env.NODE_ENV === "production";
  if (env.cronSecret) {
    if (auth !== `Bearer ${env.cronSecret}`) return unauthorized();
  } else if (isProd) {
    return skipped("missing-env");
  }

  if (!(await isOperationEnabled("wager_reconcile"))) return skipped("disabled");

  const wagerEnv = getWagerEnv();
  if (!wagerEnv.depositsEnabled) return skipped("wager-disabled");

  const { summary, status } = await recordRun("wager_reconcile", "cron", () =>
    reconcileWagerEntries(),
  );

  return NextResponse.json({ ok: true, status, ...summary });
}
