import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { checkOnboardingGate } from "@/lib/onboarding/gate-check";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);

  const gateRedirect = await checkOnboardingGate(locale);
  if (gateRedirect) redirect(gateRedirect);

  return <>{children}</>;
}
