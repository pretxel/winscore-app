import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getWagerEnv } from "@/lib/wager/env";
import { WagerAdminPanel } from "./wager-admin-panel";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.wager" });
  return { title: t("metaTitle") };
}

export default async function WagerAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);

  const t = await getTranslations("admin.wager");

  const admin = createAdminSupabaseClient();

  const [{ data: groupRows }, { data: roundRows }] = await Promise.all([
    admin.from("groups").select("id, name, competition_id").order("name"),
    admin
      .from("competition_rounds")
      .select("id, competition_id, round_number, labels")
      .order("round_number"),
  ]);

  const rounds = roundRows ?? [];
  const groups = (groupRows ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    competitionId: g.competition_id,
    rounds: rounds
      .filter((r) => r.competition_id === g.competition_id)
      .map((r) => ({
        id: r.id,
        label: r.round_number ? t("roundOption", { number: r.round_number }) : t("roundFallback"),
      })),
  }));

  const wagerEnv = getWagerEnv();
  const flagsLive = wagerEnv.depositsEnabled && wagerEnv.uiEnabled;

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t("title")} description={t("description")} />
      <WagerAdminPanel groups={groups} flagsLive={flagsLive} />
    </div>
  );
}
