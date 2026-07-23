import { ArrowRightIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LeagueRail } from "@/components/league-rail";
import { listLiveLeagues } from "@/lib/competition";
import { DEFAULT_LOCALE, isLocale, type Locale, localePath } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "catalog" });
  return {
    title: t("title"),
    description: t("lede"),
    alternates: { canonical: "/catalog" },
  };
}

// League catalog — the entry point to every live league and the redirect target
// for legacy single-competition paths / unknown league slugs. Each live league is
// a matchday-board card: its vertical nameplate rail, name + edition code, and
// the two startable actions (browse fixtures, start a group).
export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");

  const leagues = await listLiveLeagues();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="font-heading text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-xl">{t("lede")}</p>
      </header>

      {leagues.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed px-6 py-12 text-center">
          {t("empty")}
        </p>
      ) : (
        <ul className="grid gap-4">
          {leagues.map((league) => (
            <li key={league.id}>
              <div className="rise border-border bg-card flex overflow-hidden rounded-xl border">
                <LeagueRail label={league.shortName || league.name} />
                <div className="flex flex-1 flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                  <div>
                    <h2 className="font-heading text-foreground text-xl font-semibold tracking-tight">
                      {league.name}
                    </h2>
                    <p className="text-muted-foreground font-mono text-[11px] tracking-[0.22em] uppercase">
                      {league.brandCode}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={localePath(locale, `/${league.slug}/matches`)}
                      className="border-border hover:bg-secondary inline-flex min-h-10 items-center gap-1 rounded-md border px-4 text-sm font-medium transition-colors"
                    >
                      {t("fixtures")}
                      <ArrowRightIcon className="size-4" />
                    </Link>
                    <Link
                      href={localePath(locale, "/groups")}
                      className="bg-primary text-primary-foreground inline-flex min-h-10 items-center gap-1 rounded-md px-4 text-sm font-semibold"
                    >
                      <PlusIcon className="size-4" />
                      {t("start")}
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
