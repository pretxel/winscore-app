import { ArrowLeftIcon, StarIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionStatus } from "@/components/admin/action-status";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormSection } from "@/components/admin/form-section";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DEFAULT_LOCALE, isLocale, type Locale, localePath } from "@/lib/i18n";
import {
  type Phase,
  type PhaseStatus,
  phaseContaining,
  pickLabel,
  withDerivedEnds,
} from "@/lib/phases";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { closePhase, createPhase, createScheme, setDefaultScheme, updatePhase } from "./actions";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const RESCHEDULE_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

function toLocalInput(iso: string): string {
  return iso.slice(0, 16);
}

function dateOnly(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export default async function CompetitionPhasesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);
  const { status } = await searchParams;
  const t = await getTranslations("admin.phases");

  const admin = createAdminSupabaseClient();
  const { data: competition } = await admin
    .from("competitions")
    .select("id, name, tournament_start_at")
    .eq("id", id)
    .maybeSingle();
  if (!competition) notFound();

  const { data: schemeRows } = await admin
    .from("competition_phase_schemes")
    .select("id, scheme_key, labels, is_default")
    .eq("competition_id", id)
    .order("is_default", { ascending: false })
    .order("scheme_key");
  const schemes = schemeRows ?? [];

  const { data: phaseRows } = await admin
    .from("competition_phases")
    .select("id, scheme_id, phase_key, labels, display_order, starts_at, status")
    .in(
      "scheme_id",
      schemes.map((s) => s.id),
    )
    .order("display_order");

  const { data: groupRows } = await admin
    .from("groups")
    .select("phase_scheme_id")
    .eq("competition_id", id)
    .not("phase_scheme_id", "is", null);
  const groupsPerScheme = new Map<string, number>();
  for (const g of groupRows ?? []) {
    if (g.phase_scheme_id)
      groupsPerScheme.set(g.phase_scheme_id, (groupsPerScheme.get(g.phase_scheme_id) ?? 0) + 1);
  }

  // Every fixture's kickoff once; each phase's match count and the recently
  // rescheduled list are derived from it in memory.
  const { data: matchRows } = await admin
    .from("matches")
    .select("id, home_team, away_team, kickoff_at, updated_at, status")
    .eq("competition_id", id);
  const matches = matchRows ?? [];

  const phasesByScheme = new Map<string, Phase[]>();
  for (const s of schemes) {
    const rows = (phaseRows ?? [])
      .filter((p) => p.scheme_id === s.id)
      .map((p) => ({
        id: p.id,
        schemeId: p.scheme_id,
        key: p.phase_key,
        label: pickLabel(p.labels as Record<string, unknown>, locale, p.phase_key),
        displayOrder: p.display_order,
        startsAt: p.starts_at,
        status: p.status as PhaseStatus,
      }));
    phasesByScheme.set(s.id, withDerivedEnds(rows));
  }

  const defaultScheme = schemes.find((s) => s.is_default) ?? null;
  const defaultPhases = defaultScheme ? (phasesByScheme.get(defaultScheme.id) ?? []) : [];

  const cutoff = Date.now() - RESCHEDULE_LOOKBACK_MS;
  const rescheduled = matches
    .filter((m) => m.status !== "final" && Date.parse(m.updated_at) >= cutoff)
    .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at))
    .slice(0, 30);

  const statusTone: Record<PhaseStatus, string> = {
    pending: "border-border text-muted-foreground",
    active: "border-pitch/40 bg-pitch/10 text-pitch",
    closed: "border-flag/40 bg-flag/10 text-flag",
  };
  const statusLabel: Record<PhaseStatus, string> = {
    pending: t("pending"),
    active: t("active"),
    closed: t("closed"),
  };

  const inputClass =
    "border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-2 text-sm focus-visible:ring-2 focus-visible:outline-none";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="admin-reveal space-y-8">
        <div className="space-y-3">
          <Link
            href={localePath(locale, `/admin/competitions/${id}`)}
            className="inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            {t("backToCompetition")}
          </Link>
          <AdminPageHeader
            eyebrow={t("eyebrow")}
            title={`${competition.name} · ${t("title")}`}
            description={t("description")}
          />
        </div>

        {status ? (
          <ActionStatus variant="success" live={false}>
            {t("done")}
          </ActionStatus>
        ) : null}

        {schemes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-5 py-6 text-center text-sm text-muted-foreground">
            {t("schemesEmpty")}
          </p>
        ) : null}

        {schemes.map((scheme) => {
          const phases = phasesByScheme.get(scheme.id) ?? [];
          const groupCount = groupsPerScheme.get(scheme.id) ?? 0;
          return (
            <FormSection
              key={scheme.id}
              title={
                <span className="inline-flex items-center gap-2">
                  {pickLabel(scheme.labels as Record<string, unknown>, locale, scheme.scheme_key)}
                  <span className="font-mono text-[10px] normal-case tracking-normal text-muted-foreground">
                    {scheme.scheme_key}
                  </span>
                  {scheme.is_default ? (
                    <Badge className="gap-1">
                      <StarIcon className="size-3" aria-hidden />
                      {t("schemeDefault")}
                    </Badge>
                  ) : null}
                </span>
              }
              description={t("groupsUsing", { count: groupCount })}
              action={
                scheme.is_default ? null : (
                  <form action={setDefaultScheme}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="competition_id" value={id} />
                    <input type="hidden" name="scheme_id" value={scheme.id} />
                    <SubmitButton size="sm" variant="outline">
                      {t("setDefault")}
                    </SubmitButton>
                  </form>
                )
              }
            >
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      <th className="px-3 py-2 text-left">{t("phaseOrder")}</th>
                      <th className="px-3 py-2 text-left">{t("phaseLabel")}</th>
                      <th className="px-3 py-2 text-left">{t("phaseStart")}</th>
                      <th className="px-3 py-2 text-left">{t("window")}</th>
                      <th className="px-3 py-2 text-left">{t("status")}</th>
                      <th className="px-3 py-2 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {phases.map((p) => {
                      const count = matches.filter(
                        (m) =>
                          m.kickoff_at >= p.startsAt &&
                          (p.endsAt === null || m.kickoff_at < p.endsAt),
                      ).length;
                      const locked = p.status === "closed";
                      const formId = `phase-${p.id}`;
                      return (
                        <tr key={p.id} className="align-top">
                          <td className="px-3 py-2">
                            <form id={formId} action={updatePhase}>
                              <input type="hidden" name="locale" value={locale} />
                              <input type="hidden" name="competition_id" value={id} />
                              <input type="hidden" name="phase_id" value={p.id} />
                            </form>
                            <Input
                              form={formId}
                              name="display_order"
                              type="number"
                              min={1}
                              max={99}
                              defaultValue={p.displayOrder}
                              disabled={locked || p.status === "active"}
                              className="h-9 w-16"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              form={formId}
                              name="label"
                              defaultValue={p.label}
                              disabled={locked}
                              className="h-9 min-w-40"
                            />
                            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                              {p.key}
                            </p>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              form={formId}
                              name="starts_at"
                              type="datetime-local"
                              defaultValue={toLocalInput(p.startsAt)}
                              disabled={locked || p.status === "active"}
                              className="h-9"
                            />
                          </td>
                          <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted-foreground">
                            {dateOnly(p.startsAt)} →{" "}
                            {p.endsAt ? dateOnly(p.endsAt) : t("openEnded")}
                            <br />
                            {t("matches", { count })}
                          </td>
                          <td className="px-3 py-2">
                            {locked ? (
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${statusTone[p.status]}`}
                              >
                                {statusLabel[p.status]}
                              </span>
                            ) : (
                              <select
                                form={formId}
                                name="status"
                                defaultValue={p.status}
                                className={inputClass}
                              >
                                <option value="pending">{t("pending")}</option>
                                <option value="active">{t("active")}</option>
                              </select>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {locked ? null : (
                              <div className="flex flex-col items-end gap-1.5">
                                <SubmitButton form={formId} size="sm" variant="outline">
                                  {t("save")}
                                </SubmitButton>
                                <form action={closePhase}>
                                  <input type="hidden" name="locale" value={locale} />
                                  <input type="hidden" name="competition_id" value={id} />
                                  <input type="hidden" name="phase_id" value={p.id} />
                                  <SubmitButton
                                    size="sm"
                                    variant="destructive"
                                    confirmText={t("closeConfirm")}
                                  >
                                    {t("close")}
                                  </SubmitButton>
                                </form>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <form
                action={createPhase}
                className="grid grid-cols-2 items-end gap-2 rounded-xl border border-dashed border-border p-3 sm:grid-cols-[5rem_1fr_1fr_1fr_auto]"
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="competition_id" value={id} />
                <input type="hidden" name="scheme_id" value={scheme.id} />
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {t("phaseOrder")}
                  <Input
                    name="display_order"
                    type="number"
                    min={1}
                    max={99}
                    defaultValue={phases.length + 1}
                    required
                    className="h-9"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {t("phaseKey")}
                  <Input name="phase_key" required pattern="[a-z0-9-]+" className="h-9" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {t("phaseLabel")}
                  <Input name="label" required className="h-9" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {t("phaseStart")}
                  <Input name="starts_at" type="datetime-local" required className="h-9" />
                </label>
                <SubmitButton size="sm">{t("phaseNew")}</SubmitButton>
              </form>
            </FormSection>
          );
        })}

        <FormSection title={t("schemeNew")}>
          <form
            action={createScheme}
            className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]"
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="competition_id" value={id} />
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t("schemeKey")}
              <Input name="scheme_key" required pattern="[a-z0-9-]+" className="h-9" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t("schemeLabel")}
              <Input name="label" required className="h-9" />
            </label>
            <SubmitButton size="sm">{t("create")}</SubmitButton>
          </form>
        </FormSection>

        <FormSection title={t("rescheduledTitle")} description={t("rescheduledHint")}>
          {rescheduled.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("rescheduledEmpty")}</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
              {rescheduled.map((m) => {
                const phase = phaseContaining(defaultPhases, new Date(m.kickoff_at));
                return (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
                  >
                    <span className="font-medium">
                      {m.home_team} – {m.away_team}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {m.kickoff_at.slice(0, 16).replace("T", " ")} · {phase?.label ?? t("noPhase")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </FormSection>
      </div>
    </main>
  );
}
