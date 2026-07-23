import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BracketLiveRefresh } from "@/components/bracket-live-refresh";
import { BracketView } from "@/components/bracket-view";
import { getBracket } from "@/lib/bracket";
import { KNOCKOUT_ORDER } from "@/lib/bracket-core";
import { getLeagueFromContext } from "@/lib/competition";
import { getStageLabel } from "@/lib/competition-schema";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { maybeScheduleOpportunisticSync } from "@/lib/result-sync/opportunistic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; league: string }>;
}): Promise<Metadata> {
  const { locale, league } = await params;
  const t = await getTranslations({ locale, namespace: "bracket" });
  const comp = await getLeagueFromContext({ slug: league });
  return {
    title: comp ? `${t("title")} · ${comp.short_name}` : t("title"),
    description: t("description"),
    alternates: { canonical: `/${league}/bracket` },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: `/${league}/bracket`,
      type: "website",
    },
  };
}

export default async function BracketPage({
  params,
}: {
  params: Promise<{ locale: string; league: string }>;
}) {
  const { locale: raw, league } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);

  const t = await getTranslations("bracket");
  const competition = await getLeagueFromContext({ slug: league });
  const { rounds, matches, hasKnockout } = await getBracket(competition);

  // Cron-not-firing safety net: refresh overdue results after the response.
  maybeScheduleOpportunisticSync(matches);

  // Localized round names from the active competition's format, falling back to
  // the raw stage key when no competition resolves.
  const stage: Record<string, string> = {};
  for (const key of KNOCKOUT_ORDER) {
    stage[key] = competition ? getStageLabel(competition.format, key, locale) : key;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <BracketLiveRefresh />
      <header className="mb-8 border-b border-border pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          {t("eyebrow")}
        </p>
        <h1
          className="mt-1 font-heading text-4xl font-semibold tracking-tight sm:text-5xl"
          style={{ fontStretch: "condensed" }}
        >
          {t("headline")}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t("lede")}</p>
      </header>

      {hasKnockout ? (
        <BracketView
          rounds={rounds}
          labels={{
            stage,
            provisional: t("provisional"),
            thirdPlace: stage.third ?? t("thirdPlace"),
            selectorLabel: t("roundSelectorLabel"),
          }}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            {t("emptyTitle")}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm">{t("emptyBody")}</p>
        </div>
      )}
    </main>
  );
}
