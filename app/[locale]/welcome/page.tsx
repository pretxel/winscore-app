import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DEFAULT_LOCALE, isLocale, type Locale, localePath } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isWagerUiEnabled } from "@/lib/wager/env";
import { WelcomeTour } from "./welcome-tour";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "welcome" });
  return { title: t("title") };
}

export default async function WelcomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(localePath(locale, "/sign-in"));

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, welcome_seen_at")
    .eq("id", user.id)
    .single();

  // The display name is the harder gate, so an unnamed player goes back to it.
  if (!profile?.display_name) redirect(localePath(locale, "/onboarding"));

  // Already seen, or wagering is off: there is nothing to show. Re-reading the
  // material is what /how-it-works is for.
  if (profile.welcome_seen_at || !isWagerUiEnabled()) {
    redirect(localePath(locale, "/matches"));
  }

  // wallet_address is bytea, which supabase-js returns hex-escaped, so it has
  // to be decoded to base58 before the button can display it. Same conversion
  // the round page does.
  const { data: link } = await supabase
    .from("wallet_links")
    .select("wallet_address")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  let walletAddress: string | undefined;
  const hex =
    typeof link?.wallet_address === "string" ? link.wallet_address.replace(/^\\x/, "") : "";
  if (hex) {
    const { base58 } = await import("@scure/base");
    walletAddress = base58.encode(Buffer.from(hex, "hex"));
  }

  return <WelcomeTour walletAddress={walletAddress} />;
}
