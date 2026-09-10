import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

// Read-only Supabase client for SHARED data, deliberately cookie-free.
//
// `createServerSupabaseClient` attaches the visitor's session by reading
// cookies, which is exactly what a cached function may not do — and what makes
// a route render per request. This client carries no cookies and no session,
// so it runs as the `anon` role and is safe to call inside `use cache`.
//
// It therefore sees only what RLS grants anonymously: competitions, matches,
// the leaderboard views and functions, phase schemes and phases. Anything
// gated on `auth.uid()` returns nothing here, which is the point — per-user
// data is never shared content and belongs on the session client.
//
// `leagueSlug` sends the `x-league` header exactly as the session client does,
// so `active_competition_id()` and every league-scoped view resolve the same
// way for a cached read as for a request-time one.
export function createPublicSupabaseClient(leagueSlug?: string) {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      // No session to read, refresh, or persist: this client is stateless by
      // design, and any of these would reintroduce per-request behaviour.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...(leagueSlug ? { global: { headers: { "x-league": leagueSlug } } } : {}),
  });
}
