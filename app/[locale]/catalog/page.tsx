import Link from "next/link";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { listLiveLeagues } from "@/lib/competition";
import { isLocale, localePath, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Leagues",
  alternates: { canonical: "/catalog" },
};

// League catalog — the entry point to every live league and the redirect target
// for legacy single-competition paths / unknown league slugs. This is the
// functional stub; task 4.2 replaces it with the "matchday board" catalog
// design (LeagueLane rails + startable options).
export default async function CatalogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);

  const leagues = await listLiveLeagues();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-heading text-3xl tracking-tight">Leagues</h1>
      {leagues.length === 0 ? (
        <p className="text-muted-foreground mt-6">No live leagues yet.</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {leagues.map((league) => (
            <li key={league.id}>
              <Link
                href={localePath(locale, `/${league.slug}/matches`)}
                className="border-border hover:bg-secondary flex items-center justify-between rounded-lg border px-4 py-3 transition-colors"
              >
                <span className="font-medium">{league.name}</span>
                <span className="text-muted-foreground text-sm">
                  {league.shortName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
