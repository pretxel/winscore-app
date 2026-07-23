import { redirect } from "next/navigation";
import { getActiveCompetition } from "@/lib/competition";
import { DEFAULT_LOCALE, isLocale, type Locale, localePath } from "@/lib/i18n";

// The quiz is league-scoped (`/[league]/quiz`). This legacy path redirects to
// the active competition's quiz, falling back to the league catalog when no
// competition is active.
export default async function LegacyQuizRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  const active = await getActiveCompetition();
  redirect(active ? localePath(locale, `/${active.slug}/quiz`) : localePath(locale, "/catalog"));
}
