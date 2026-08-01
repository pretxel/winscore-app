import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { checkOnboardingGate } from "@/lib/onboarding/gate-check";

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

  const gateRedirect = await checkOnboardingGate(locale);
  if (gateRedirect) redirect(gateRedirect);

  return <>{children}</>;
}
