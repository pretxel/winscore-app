import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, requireServiceRoleKey } from "@/lib/env";
import type { Database } from "@/lib/database.types";

// `leagueSlug` scopes DB reads/writes to a league: it is sent as the `x-league`
// request header, which `active_competition_id()` resolves so every
// competition-scoped view/RLS/function targets that league. Omit it to fall back
// to the single active competition (transition behavior). The per-league cron
// loops pass it so each iteration's writes/reads scope to one live league.
export function createAdminSupabaseClient(leagueSlug?: string) {
  return createClient<Database>(env.supabaseUrl, requireServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(leagueSlug
      ? { global: { headers: { "x-league": leagueSlug } } }
      : {}),
  });
}
