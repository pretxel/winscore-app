import "server-only";
import type { Locale } from "@/lib/i18n";
import type { ReadClient } from "@/lib/supabase/read-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PhaseStatus = "pending" | "active" | "closed";

export type PhaseScheme = {
  id: string;
  competitionId: string;
  key: string;
  label: string;
  isDefault: boolean;
};

export type Phase = {
  id: string;
  schemeId: string;
  key: string;
  label: string;
  displayOrder: number;
  startsAt: string;
  // Derived from the next phase's start; null for the last phase (open-ended).
  endsAt: string | null;
  status: PhaseStatus;
};

export type PhaseWinner = {
  phaseId: string;
  userId: string;
  displayName: string | null;
  totalPoints: number;
  decidedAt: string;
};

type LabelMap = Record<string, unknown> | null;

// Pick the locale's label, then English, then the key — the same fallback order
// the stage labels use so a scheme seeded in one language never renders empty.
export function pickLabel(labels: LabelMap, locale: Locale, fallback: string): string {
  if (labels && typeof labels === "object") {
    const local = labels[locale];
    if (typeof local === "string" && local.trim()) return local;
    const en = labels.en;
    if (typeof en === "string" && en.trim()) return en;
  }
  return fallback;
}

// Derive each phase's end from the next phase's start within the same scheme.
// Pure so the boundary rule is unit-testable without a database; the SQL side
// (phase_bounds) applies the same rule with lead().
export function withDerivedEnds<T extends { displayOrder: number; startsAt: string }>(
  phases: T[],
): (T & { endsAt: string | null })[] {
  const sorted = [...phases].sort((a, b) => a.displayOrder - b.displayOrder);
  return sorted.map((p, i) => ({ ...p, endsAt: sorted[i + 1]?.startsAt ?? null }));
}

// The phase whose half-open window [startsAt, endsAt) contains the instant.
export function phaseContaining<T extends { startsAt: string; endsAt: string | null }>(
  phases: T[],
  at: Date,
): T | null {
  const t = at.getTime();
  for (const p of phases) {
    const start = Date.parse(p.startsAt);
    const end = p.endsAt ? Date.parse(p.endsAt) : Number.POSITIVE_INFINITY;
    if (t >= start && t < end) return p;
  }
  return null;
}

// The phase the leaderboard shows when none is named: the active one, else the
// most recently closed one, else nothing (a scheme with only pending phases).
export function defaultPhase<T extends { status: PhaseStatus; displayOrder: number }>(
  phases: T[],
): T | null {
  const active = phases.find((p) => p.status === "active");
  if (active) return active;
  const closed = phases.filter((p) => p.status === "closed");
  if (closed.length === 0) return null;
  return closed.reduce((a, b) => (b.displayOrder > a.displayOrder ? b : a));
}

export async function listSchemes(
  competitionId: string,
  locale: Locale,
  client?: ReadClient,
): Promise<PhaseScheme[]> {
  const supabase = client ?? (await createServerSupabaseClient());
  const { data } = await supabase
    .from("competition_phase_schemes")
    .select("id, competition_id, scheme_key, labels, is_default")
    .eq("competition_id", competitionId)
    .order("is_default", { ascending: false })
    .order("scheme_key", { ascending: true });
  return (data ?? []).map((s) => ({
    id: s.id,
    competitionId: s.competition_id,
    key: s.scheme_key,
    label: pickLabel(s.labels as LabelMap, locale, s.scheme_key),
    isDefault: s.is_default,
  }));
}

export async function getDefaultScheme(
  competitionId: string,
  locale: Locale,
  client?: ReadClient,
): Promise<PhaseScheme | null> {
  const schemes = await listSchemes(competitionId, locale, client);
  return schemes.find((s) => s.isDefault) ?? null;
}

export async function getScheme(schemeId: string, locale: Locale): Promise<PhaseScheme | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("competition_phase_schemes")
    .select("id, competition_id, scheme_key, labels, is_default")
    .eq("id", schemeId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    competitionId: data.competition_id,
    key: data.scheme_key,
    label: pickLabel(data.labels as LabelMap, locale, data.scheme_key),
    isDefault: data.is_default,
  };
}

// A scheme's phases in display order, with derived ends.
export async function listPhases(
  schemeId: string,
  locale: Locale,
  client?: ReadClient,
): Promise<Phase[]> {
  const supabase = client ?? (await createServerSupabaseClient());
  const { data } = await supabase
    .from("competition_phases")
    .select("id, scheme_id, phase_key, labels, display_order, starts_at, status")
    .eq("scheme_id", schemeId)
    .order("display_order", { ascending: true });
  const rows = (data ?? []).map((p) => ({
    id: p.id,
    schemeId: p.scheme_id,
    key: p.phase_key,
    label: pickLabel(p.labels as LabelMap, locale, p.phase_key),
    displayOrder: p.display_order,
    startsAt: p.starts_at,
    status: p.status as PhaseStatus,
  }));
  return withDerivedEnds(rows);
}

// Recorded winners for a group across every closed phase, one row per winner
// (joint winners produce several rows for the same phase). Members only, via
// RLS; a non-member gets [].
export async function listGroupPhaseWinners(groupId: string): Promise<PhaseWinner[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("competition_phase_winners")
    .select("phase_id, user_id, total_points, decided_at, profiles(display_name)")
    .eq("group_id", groupId)
    .order("decided_at", { ascending: true });
  return (data ?? []).map((w) => ({
    phaseId: w.phase_id,
    userId: w.user_id,
    displayName: w.profiles?.display_name ?? null,
    totalPoints: w.total_points,
    decidedAt: w.decided_at,
  }));
}
