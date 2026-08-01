import { type Locale, localePath } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isWagerUiEnabled } from "@/lib/wager/env";
import { resolveOnboardingRedirect } from "./gate";

/**
 * Runs the full sign-in + onboarding gate check against the current user.
 * Returns a redirect URL or null — callers redirect when non-null.
 */
export async function checkOnboardingGate(locale: Locale): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return localePath(locale, "/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, welcome_seen_at")
    .eq("id", user.id)
    .single();

  const target = resolveOnboardingRedirect({
    displayName: profile?.display_name ?? null,
    welcomeSeenAt: profile?.welcome_seen_at ?? null,
    wagerUiEnabled: isWagerUiEnabled(),
  });

  return target ? localePath(locale, target) : null;
}
