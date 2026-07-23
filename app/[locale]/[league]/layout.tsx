import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getLeagueFromContext } from "@/lib/competition";
import { DEFAULT_LOCALE, isLocale, type Locale, localePath } from "@/lib/i18n";

// Validates the `[league]` slug once for every page beneath it. An unknown or
// non-live slug routes to the league catalog rather than 404-ing (spec:
// "Unknown league routes to catalog"). `getLeagueFromContext` is request-cached,
// so the pages below re-resolve the same league for free.
export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; league: string }>;
}) {
  const { locale: raw, league } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);

  const resolved = await getLeagueFromContext({ slug: league });
  if (!resolved) {
    redirect(localePath(locale, "/catalog"));
  }

  return <>{children}</>;
}
