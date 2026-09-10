import { redirect } from "next/navigation";
import { getActiveCompetition } from "@/lib/competition";
import { DEFAULT_LOCALE, isLocale, type Locale, localePath } from "@/lib/i18n";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

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
