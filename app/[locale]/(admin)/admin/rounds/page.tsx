import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getTranslations } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { SubmitButton } from "@/components/admin/submit-button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  createRound,
  assignFixtureToRound,
  unassignFixture,
  markRoundReviewed,
  closeRound,
} from "./actions";

export const metadata: Metadata = {
  title: "Competition Rounds — Admin",
};

export default async function RoundsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const t = await getTranslations({ locale, namespace: "admin" });
  const common = await getTranslations({ locale, namespace: "common" });

  const admin = createAdminSupabaseClient();

  const { data: competitions } = await admin
    .from("competitions")
    .select("id, name, short_name, is_live")
    .order("name");

  const { data: rounds } = await admin
    .from("competition_rounds")
    .select(
      `*, matches (id, home_team, away_team, kickoff_at, status, stage)`
    )
    .order("display_order");

  const { data: unassignedMatches } = await admin
    .from("matches")
    .select("id, home_team, away_team, kickoff_at, competition_id, stage")
    .is("round_id", null)
    .neq("status", "cancelled")
    .order("kickoff_at", { ascending: true });

  const getCompName = (compId: string) =>
    competitions?.find((c) => c.id === compId)?.short_name ?? compId;

  const reviewBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      unmapped: "secondary",
      mapped: "default",
      conflict: "destructive",
      changed: "destructive",
      reviewed: "outline",
    };
    return (
      <Badge variant={variants[status] ?? "secondary"}>
        {t(`rounds.reviewStatus.${status}`) ?? status}
      </Badge>
    );
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      active: "default",
      closed: "outline",
      review: "destructive",
    };
    return (
      <Badge variant={variants[status] ?? "secondary"}>
        {t(`rounds.status.${status}`) ?? status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("rounds.title")}
        description={t("rounds.description")}
      />

      <Tabs defaultValue="rounds">
        <TabsList>
          <TabsTrigger value="rounds">{t("rounds.tabs.rounds")}</TabsTrigger>
          <TabsTrigger value="unmapped">
            {t("rounds.tabs.unmapped")}{" "}
            {unassignedMatches?.length ? `(${unassignedMatches.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="create">{t("rounds.tabs.create")}</TabsTrigger>
        </TabsList>

        <TabsContent value="rounds" className="space-y-4">
          {!rounds?.length ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("rounds.empty")}
              </CardContent>
            </Card>
          ) : (
            rounds.map((r) => (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Link
                        href={`/admin/rounds/${r.id}`}
                        className="hover:underline"
                      >
                        {r.round_number
                          ? `#${r.round_number} — ${r.round_key}`
                          : r.round_key}
                      </Link>
                      {statusBadge(r.status)}
                      {reviewBadge(r.provider_review_status)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {getCompName(r.competition_id)} ·{" "}
                      {r.matches?.length ?? 0} {t("rounds.fixtures")} ·{" "}
                      {t("rounds.opens")}{" "}
                      {new Date(r.opens_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {r.status !== "closed" &&
                      r.provider_review_status !== "reviewed" && (
                        <form action={markRoundReviewed}>
                          <input type="hidden" name="round_id" value={r.id} />
                          <SubmitButton size="sm" variant="outline">
                            {t("rounds.markReviewed")}
                          </SubmitButton>
                        </form>
                      )}
                    {r.status !== "closed" && (
                      <form action={closeRound}>
                        <input type="hidden" name="round_id" value={r.id} />
                        <SubmitButton
                          size="sm"
                          variant="destructive"
                          confirmText={t("rounds.closeConfirm")}
                        >
                          {t("rounds.close")}
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </CardHeader>
                {r.matches?.length > 0 && (
                  <CardContent>
                    <div className="space-y-2">
                      {r.matches.map((m: Record<string, unknown>) => (
                        <div
                          key={m.id as string}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                          <span>
                            {m.home_team as string} vs {m.away_team as string}
                          </span>
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Badge variant="outline">{m.stage as string}</Badge>
                            <Badge variant="secondary">{m.status as string}</Badge>
                            {new Date(
                              m.kickoff_at as string
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="unmapped" className="space-y-4">
          {!unassignedMatches?.length ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("rounds.allMapped")}
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t("rounds.unmappedDescription")}
              </p>
              {unassignedMatches.map((m) => (
                <Card key={m.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <span className="font-medium">
                        {m.home_team} vs {m.away_team}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {getCompName(m.competition_id)} · {m.stage} ·{" "}
                        {new Date(m.kickoff_at).toLocaleString()}
                      </p>
                    </div>
                    <form
                      action={assignFixtureToRound}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="hidden"
                        name="match_id"
                        value={m.id}
                      />
                      <input type="hidden" name="locale" value={locale} />
                      <NativeSelect
                        name="round_id"
                        className="w-56"
                        required
                      >
                        <option value="">
                          {t("rounds.selectRound")}
                        </option>
                        {(rounds ?? [])
                          .filter((r) => r.competition_id === m.competition_id)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.round_number
                                ? `#${r.round_number} ${r.round_key}`
                                : r.round_key}
                            </option>
                          ))}
                      </NativeSelect>
                      <SubmitButton size="sm">{t("rounds.assign")}</SubmitButton>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>{t("rounds.createTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createRound} className="space-y-4">
                <input type="hidden" name="locale" value={locale} />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="competition_id"
                      className="text-sm font-medium"
                    >
                      {t("rounds.form.competition")}
                    </label>
                    <NativeSelect
                      id="competition_id"
                      name="competition_id"
                      required
                    >
                      <option value="">{t("rounds.form.selectComp")}</option>
                      {(competitions ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.short_name} ({c.name})
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="round_key"
                      className="text-sm font-medium"
                    >
                      {t("rounds.form.roundKey")}
                    </label>
                    <Input
                      id="round_key"
                      name="round_key"
                      required
                      placeholder="e.g. Matchday 1"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="round_number"
                      className="text-sm font-medium"
                    >
                      {t("rounds.form.roundNumber")}
                    </label>
                    <Input
                      id="round_number"
                      name="round_number"
                      type="number"
                      placeholder="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="display_order"
                      className="text-sm font-medium"
                    >
                      {t("rounds.form.displayOrder")}
                    </label>
                    <Input
                      id="display_order"
                      name="display_order"
                      type="number"
                      defaultValue="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t("rounds.form.labels")}
                    </label>
                    <input
                      type="hidden"
                      name="labels"
                      defaultValue={JSON.stringify({
                        en: "",
                        es: "",
                        fr: "",
                        de: "",
                      })}
                    />
                    <Input
                      name="label_en"
                      placeholder="en"
                      className="mb-1"
                    />
                    <Input
                      name="label_es"
                      placeholder="es"
                      className="mb-1"
                    />
                    <Input name="label_fr" placeholder="fr" className="mb-1" />
                    <Input name="label_de" placeholder="de" />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="opens_at"
                      className="text-sm font-medium"
                    >
                      {t("rounds.form.opensAt")}
                    </label>
                    <Input
                      id="opens_at"
                      name="opens_at"
                      type="datetime-local"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="admin_closes_at"
                      className="text-sm font-medium"
                    >
                      {t("rounds.form.adminClosesAt")}
                    </label>
                    <Input
                      id="admin_closes_at"
                      name="admin_closes_at"
                      type="datetime-local"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="status" className="text-sm font-medium">
                      {t("rounds.form.status")}
                    </label>
                    <NativeSelect id="status" name="status" defaultValue="pending">
                      <option value="pending">{t("rounds.status.pending")}</option>
                      <option value="active">{t("rounds.status.active")}</option>
                      <option value="review">{t("rounds.status.review")}</option>
                    </NativeSelect>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t("rounds.form.providerMetadata")}
                    </label>
                    <input
                      type="hidden"
                      name="provider_metadata"
                      defaultValue="{}"
                    />
                    <Input
                      name="provider_key"
                      placeholder="e.g. Regular Season - 1"
                    />
                  </div>
                </div>

                <Separator />
                <SubmitButton>{"Create Round"}</SubmitButton>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
