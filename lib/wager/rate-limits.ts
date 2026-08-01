/**
 * Server-side rate limiting for wager operations.
 *
 * Backed by public.wager_rate_limit_events, an append-only ledger written
 * through the service role. Attempts are recorded before the work runs, so a
 * request that fails still consumes budget and a retry loop cannot be used to
 * get unlimited attempts.
 *
 * Fails closed. An unreadable ledger or an unrecognised operation denies the
 * request: these paths create wallet challenges, wager intents and on-chain
 * writes, so allowing an unmetered flood is worse than rejecting a request the
 * caller can retry.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  wallet_challenge: { windowMs: 3600_000, maxRequests: 5 }, // 5/hour
  wallet_verify: { windowMs: 3600_000, maxRequests: 10 }, // 10/hour
  wager_intent: { windowMs: 3600_000, maxRequests: 10 }, // 10/hour
  wager_prepare: { windowMs: 3600_000, maxRequests: 20 }, // 20/hour
  wager_submit: { windowMs: 3600_000, maxRequests: 20 }, // 20/hour
  wager_init: { windowMs: 3600_000, maxRequests: 5 }, // 5/hour per owner
  wager_settle: { windowMs: 3600_000, maxRequests: 20 }, // 20/hour per operator
};

export interface RateLimitResult {
  allowed: boolean;
  /** Requests left in the window, or 0 when denied. */
  remaining: number;
  /** Set when the request was denied, for the response body. */
  reason?: string;
}

/**
 * Check whether a user may perform an operation. Does not consume budget —
 * call `recordRateLimitAttempt` for that.
 */
export async function checkRateLimit(userId: string, operation: string): Promise<RateLimitResult> {
  const config = RATE_LIMITS[operation];
  if (!config) {
    return { allowed: false, remaining: 0, reason: "Unknown rate-limited operation" };
  }

  const admin = createAdminSupabaseClient();
  const windowStart = new Date(Date.now() - config.windowMs).toISOString();

  const { count, error } = await admin
    .from("wager_rate_limit_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("operation", operation)
    .gte("observed_at", windowStart);

  if (error) {
    return { allowed: false, remaining: 0, reason: "Rate limit check failed" };
  }

  const used = count ?? 0;
  return {
    allowed: used < config.maxRequests,
    remaining: Math.max(0, config.maxRequests - used),
    ...(used < config.maxRequests ? {} : { reason: "Rate limit exceeded" }),
  };
}

/**
 * Consume one unit of budget. Best-effort: a failed insert is not worth failing
 * the user's request over, since the next check still sees every row that did
 * land.
 */
export async function recordRateLimitAttempt(userId: string, operation: string): Promise<void> {
  if (!RATE_LIMITS[operation]) return;
  const admin = createAdminSupabaseClient();
  await admin.from("wager_rate_limit_events").insert({ user_id: userId, operation });
}

/**
 * Check and consume in one call. Returns the same shape as `checkRateLimit`;
 * budget is only consumed when the request is allowed through.
 */
export async function enforceRateLimit(
  userId: string,
  operation: string,
): Promise<RateLimitResult> {
  const result = await checkRateLimit(userId, operation);
  if (result.allowed) await recordRateLimitAttempt(userId, operation);
  return result;
}
