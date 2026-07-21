import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "@/lib/database.types";

// `leagueSlug` scopes DB reads/writes to a league: it is sent as the `x-league`
// request header, which `active_competition_id()` resolves so every
// competition-scoped view/RLS/function targets that league. Omit it to fall back
// to the single active competition (transition behavior).
export async function createServerSupabaseClient(leagueSlug?: string) {
  const cookieStore = await cookies();
  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    ...(leagueSlug
      ? { global: { headers: { "x-league": leagueSlug } } }
      : {}),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options as CookieOptions);
          }
        } catch {
          // Server Components can't set cookies; middleware refreshes them.
        }
      },
    },
  });
}
