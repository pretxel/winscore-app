/**
 * Server-side rate limiting for wager operations.
 * Uses Supabase DB to track request counts per user per window.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  wallet_challenge: { windowMs: 3600_000, maxRequests: 5 },   // 5/hour
  wallet_verify: { windowMs: 3600_000, maxRequests: 10 },     // 10/hour
  wager_intent: { windowMs: 3600_000, maxRequests: 10 },      // 10/hour
  wager_init: { windowMs: 3600_000, maxRequests: 5 },         // 5/hour per owner
  wager_settle: { windowMs: 3600_000, maxRequests: 20 },      // 20/hour per operator
};

/**
 * Check if a user has exceeded the rate limit for an operation.
 * Returns true if the request is allowed.
 */
export async function checkRateLimit(
  userId: string,
  operation: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const config = RATE_LIMITS[operation];
  if (!config) return { allowed: true, remaining: -1 };

  const admin = createAdminSupabaseClient();
  const windowStart = new Date(Date.now() - config.windowMs).toISOString();

  // Count recent operations
  const { count, error } = await admin
    .from("wager_chain_events")
    .select("*", { count: "exact", head: true })
    .eq("parsed_data->>'user_id'", userId)
    .eq("event_type", operation)
    .gte("observed_at", windowStart);

  if (error) {
    // On DB error, allow the request (fail-open for MVP)
    return { allowed: true, remaining: -1 };
  }

  const used = count ?? 0;
  const remaining = Math.max(0, config.maxRequests - used);
  return { allowed: used < config.maxRequests, remaining };
}
