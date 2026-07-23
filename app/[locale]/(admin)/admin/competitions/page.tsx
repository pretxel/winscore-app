import { PlusIcon, TrophyIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { SetActiveDialog } from "@/components/admin/set-active-dialog";
import { StatusCard } from "@/components/admin/status-card";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getManagedCompetitionId } from "@/lib/admin/managed-competition";
import { DEFAULT_LOCALE, isLocale, type Locale, localePath } from "@/lib/i18n";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { deleteCompetition, finishLeague, restartLeague, setManagedCompetition } from "./actions";

const WC_SEED_SLUG = "world-cup-2026";

export default async function AdminCompetitionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);

  const t = await getTranslations("admin");

  const admin = createAdminSupabaseClient();
  const [{ data: competitions }, managedId] = await Promise.all([
    admin
      .from("competitions")
      .select("id, slug, name, short_name, season, status, finished_at")
      .order("season", { ascending: false }),
    getManagedCompetitionId(),
  ]);

  const rows = competitions ?? [];
  const activeName = rows.find((c) => c.status === "active")?.name ?? null;

  // Fixture counts (few competitions → a small fan-out of head counts).
  const fixtureCounts = new Map<string, number>();
  await Promise.all(
    rows.map(async (c) => {
      const { count } = await admin
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", c.id);
      fixtureCounts.set(c.id, count ?? 0);
    }),
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="admin-reveal space-y-8">
        <AdminPageHeader
          title={t("competitions.title")}
          description={t("competitions.description")}
          actions={
            <Link href={localePath(locale, "/admin/competitions/new")}>
              <Button>
                <PlusIcon aria-hidden />
                {t("competitions.new")}
              </Button>
            </Link>
          }
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={<TrophyIcon />}
            title={t("competitions.emptyTitle")}
            description={t("competitions.emptyBody")}
            action={
              <Link href={localePath(locale, "/admin/competitions/new")}>
                <Button>
                  <PlusIcon aria-hidden />
                  {t("competitions.new")}
                </Button>
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-4">
            {rows.map((c) => {
              const isManaged = c.id === managedId;
              const fixtures = fixtureCounts.get(c.id) ?? 0;
              const isActive = c.status === "active";
              const isFinished = c.status === "finished";
              const isWcSeed = c.slug === WC_SEED_SLUG;
              const deletable = !isActive && !isWcSeed && fixtures === 0;
              return (
                <li key={c.id}>
                  <StatusCard
                    label={c.slug}
                    value={c.name}
                    badges={
                      <>
                        {isActive ? <Badge>{t("competitions.badgeActive")}</Badge> : null}
                        {c.status === "manage" ? (
                          <Badge variant="outline">{t("competitions.badgeDraft") ?? "Draft"}</Badge>
                        ) : null}
                        {isManaged ? (
                          <Badge variant="outline">{t("competitions.badgeManaging")}</Badge>
                        ) : null}
                        {isFinished ? (
                          <Badge
                            variant="outline"
                            className="border-muted-foreground/30 text-muted-foreground"
                          >
                            {t("competitions.badgeFinished")}
                          </Badge>
                        ) : null}
                      </>
                    }
                    meta={
                      <>
                        {c.season ? (
                          <span>{t("competitions.season", { season: c.season })}</span>
                        ) : null}
                        {c.season ? <span aria-hidden>·</span> : null}
                        <span>{t("competitions.fixtures", { count: fixtures })}</span>
                      </>
                    }
                    actions={
                      <>
                        {!isManaged ? (
                          <form action={setManagedCompetition}>
                            <input type="hidden" name="id" value={c.id} />
                            <SubmitButton size="sm" variant="outline">
                              {t("competitions.manage")}
                            </SubmitButton>
                          </form>
                        ) : null}

                        {!isActive ? (
                          <SetActiveDialog
                            id={c.id}
                            name={c.name}
                            currentActiveName={activeName}
                            hasFixtures={fixtures > 0}
                          />
                        ) : null}

                        <Link href={localePath(locale, `/admin/competitions/${c.id}`)}>
                          <Button size="sm" variant="ghost">
                            {t("competitions.edit")}
                          </Button>
                        </Link>

                        {/* Finish / Restart */}
                        {!isWcSeed && !isActive ? (
                          isFinished ? (
                            <form action={restartLeague}>
                              <input type="hidden" name="id" value={c.id} />
                              <input type="hidden" name="locale" value={locale} />
                              <SubmitButton
                                size="sm"
                                variant="outline"
                                confirmText={t("competitions.restartConfirm", { name: c.name })}
                              >
                                {t("competitions.restart")}
                              </SubmitButton>
                            </form>
                          ) : (
                            <form action={finishLeague}>
                              <input type="hidden" name="id" value={c.id} />
                              <input type="hidden" name="locale" value={locale} />
                              <SubmitButton
                                size="sm"
                                variant="outline"
                                confirmText={t("competitions.finishConfirm", { name: c.name })}
                              >
                                {t("competitions.finish")}
                              </SubmitButton>
                            </form>
                          )
                        ) : null}

                        {deletable ? (
                          <form action={deleteCompetition} className="ml-auto">
                            <input type="hidden" name="id" value={c.id} />
                            <SubmitButton
                              size="sm"
                              variant="destructive"
                              confirmText={t("competitions.deleteConfirm", {
                                name: c.name,
                              })}
                            >
                              {t("competitions.delete")}
                            </SubmitButton>
                          </form>
                        ) : null}
                      </>
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
