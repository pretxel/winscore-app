import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getWagerEnv } from "@/lib/wager/env";
import { WagerAdminPanel } from "./wager-admin-panel";

export const metadata: Metadata = {
  title: "Wager Config — Admin",
};

export default async function WagerAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);

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
        label: r.round_number ? `Round ${r.round_number}` : "Round",
      })),
  }));

  const wagerEnv = getWagerEnv();
  const flagsLive = wagerEnv.depositsEnabled && wagerEnv.uiEnabled;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Wager Config"
        description="Configure pool wagering, initialize on-chain rounds, and check status."
      />
      <WagerAdminPanel groups={groups} flagsLive={flagsLive} />
    </div>
  );
}
