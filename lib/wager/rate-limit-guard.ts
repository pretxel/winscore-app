import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/wager/rate-limits";

/**
 * Route-handler guard around enforceRateLimit.
 *
 * Returns a 429 response when the caller is over budget, or null to continue.
 * Kept separate from rate-limits.ts so that module stays free of next/server
 * and remains unit-testable without a request context.
 */
export async function rateLimitGuard(
  userId: string,
  operation: string,
): Promise<NextResponse | null> {
  const result = await enforceRateLimit(userId, operation);
  if (result.allowed) return null;

  return NextResponse.json(
    { error: result.reason ?? "Rate limit exceeded" },
    { status: 429, headers: { "Cache-Control": "no-store" } },
  );
}
