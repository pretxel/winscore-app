import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { DEFAULT_LOCALE, isLocale, type Locale, localePath } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Auth gate for the signed-in pages under `[league]` (my-picks). Mirrors the
// original `(app)` layout: require a session and a completed profile, else
// redirect to sign-in / onboarding. League validity is handled by the parent
// `[league]` layout.
export default async function LeagueAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; league: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(localePath(locale, "/sign-in"));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  if (!profile?.display_name) {
    redirect(localePath(locale, "/onboarding"));
  }

  return <>{children}</>;
}
