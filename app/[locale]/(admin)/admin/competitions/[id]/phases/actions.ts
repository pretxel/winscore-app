"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEFAULT_LOCALE, isLocale, type Locale, localePath } from "@/lib/i18n";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Admin-only writes for phase schemes and phases. Every action re-checks the
// caller is an admin before touching anything; the DB triggers enforce the
// lifecycle rules (closed phases immutable, active windows fixed) as a second
// line, so a stale form cannot slip past. Closing goes through close_phase(),
// which freezes each group's winner in the same transaction.

const idSchema = z.string().uuid();
const keySchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9-]+$/, "lowercase letters, digits and dashes");
const labelSchema = z.string().trim().min(1).max(80);

async function assertAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) throw new Error("Admin only");
  return supabase;
}

function formLocale(formData: FormData) {
  const raw = formData.get("locale");
  return typeof raw === "string" && isLocale(raw) ? raw : DEFAULT_LOCALE;
}

function str(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v : "";
}

// datetime-local submits a zone-less "YYYY-MM-DDTHH:mm"; treat it as UTC so the
// stored instant round-trips losslessly (same convention as the fixture form).
function toIsoUtc(value: string): string {
  const hasZone = /([zZ])|([+-]\d{2}:?\d{2})$/.test(value);
  const d = new Date(hasZone ? value : `${value}Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid start");
  return d.toISOString();
}

function back(locale: Locale, competitionId: string, status: string): never {
  const path = localePath(locale, `/admin/competitions/${competitionId}/phases`);
  revalidatePath(path);
  revalidatePath("/groups");
  redirect(`${path}?status=${encodeURIComponent(status)}`);
}

export async function createScheme(formData: FormData): Promise<void> {
  await assertAdmin();
  const locale = formLocale(formData);
  const competitionId = idSchema.parse(str(formData, "competition_id"));
  const key = keySchema.parse(str(formData, "scheme_key"));
  const label = labelSchema.parse(str(formData, "label"));
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("competition_phase_schemes").insert({
    competition_id: competitionId,
    scheme_key: key,
    labels: { en: label },
    is_default: false,
  });
  if (error) throw new Error(error.message);
  back(locale, competitionId, "scheme-created");
}

export async function setDefaultScheme(formData: FormData): Promise<void> {
  await assertAdmin();
  const locale = formLocale(formData);
  const competitionId = idSchema.parse(str(formData, "competition_id"));
  const schemeId = idSchema.parse(str(formData, "scheme_id"));
  const admin = createAdminSupabaseClient();
  // Clear first: the partial unique index allows exactly one default.
  const cleared = await admin
    .from("competition_phase_schemes")
    .update({ is_default: false })
    .eq("competition_id", competitionId)
    .eq("is_default", true);
  if (cleared.error) throw new Error(cleared.error.message);
  const { error } = await admin
    .from("competition_phase_schemes")
    .update({ is_default: true })
    .eq("id", schemeId)
    .eq("competition_id", competitionId);
  if (error) throw new Error(error.message);
  back(locale, competitionId, "default-set");
}

export async function createPhase(formData: FormData): Promise<void> {
  await assertAdmin();
  const locale = formLocale(formData);
  const competitionId = idSchema.parse(str(formData, "competition_id"));
  const schemeId = idSchema.parse(str(formData, "scheme_id"));
  const key = keySchema.parse(str(formData, "phase_key"));
  const label = labelSchema.parse(str(formData, "label"));
  const order = z.coerce.number().int().min(1).max(99).parse(str(formData, "display_order"));
  const startsAt = toIsoUtc(str(formData, "starts_at"));
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("competition_phases").insert({
    scheme_id: schemeId,
    phase_key: key,
    labels: { en: label },
    display_order: order,
    starts_at: startsAt,
    status: "pending",
  });
  if (error) throw new Error(error.message);
  back(locale, competitionId, "phase-created");
}

export async function updatePhase(formData: FormData): Promise<void> {
  await assertAdmin();
  const locale = formLocale(formData);
  const competitionId = idSchema.parse(str(formData, "competition_id"));
  const phaseId = idSchema.parse(str(formData, "phase_id"));
  const label = labelSchema.parse(str(formData, "label"));
  const order = z.coerce.number().int().min(1).max(99).parse(str(formData, "display_order"));
  const startsAt = toIsoUtc(str(formData, "starts_at"));
  const status = z.enum(["pending", "active"]).parse(str(formData, "status"));
  const admin = createAdminSupabaseClient();
  // Merge the English label into whatever labels exist so seeded translations
  // survive an admin edit.
  const { data: current } = await admin
    .from("competition_phases")
    .select("labels")
    .eq("id", phaseId)
    .maybeSingle();
  const labels = { ...((current?.labels as Record<string, unknown>) ?? {}), en: label };
  const { error } = await admin
    .from("competition_phases")
    .update({ labels, display_order: order, starts_at: startsAt, status })
    .eq("id", phaseId);
  if (error) throw new Error(error.message);
  back(locale, competitionId, "phase-saved");
}

export async function closePhase(formData: FormData): Promise<void> {
  const supabase = await assertAdmin();
  const locale = formLocale(formData);
  const competitionId = idSchema.parse(str(formData, "competition_id"));
  const phaseId = idSchema.parse(str(formData, "phase_id"));
  // Runs as the admin's own session: close_phase() re-checks is_admin() and
  // records every group's winner before flipping the status.
  const { data, error } = await supabase.rpc("close_phase", { p_phase_id: phaseId });
  if (error) throw new Error(error.message);
  back(locale, competitionId, `phase-closed:${data ?? 0}`);
}
