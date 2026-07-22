"use server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { localePath } from "@/lib/i18n";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function formLocale(formData: FormData): string {
  return (formData.get("locale") as string) ?? "en";
}

export async function createRound(formData: FormData): Promise<void> {
  const admin = createAdminSupabaseClient();
  const locale = formLocale(formData);

  await admin.rpc("create_competition_round", {
    p_competition_id: formData.get("competition_id") as string,
    p_round_key: formData.get("round_key") as string,
    p_round_number: formData.get("round_number")
      ? parseInt(formData.get("round_number") as string)
      : undefined,
    p_labels: JSON.parse((formData.get("labels") as string) ?? "{}"),
    p_display_order: parseInt((formData.get("display_order") as string) ?? "0"),
    p_opens_at: formData.get("opens_at") as string,
    p_admin_closes_at: (formData.get("admin_closes_at") as string) || undefined,
    p_status: (formData.get("status") as string) ?? "pending",
    p_provider_metadata: JSON.parse(
      (formData.get("provider_metadata") as string) ?? "{}"
    ),
  });

  revalidatePath("/admin/rounds");
  redirect(localePath(locale as never, "/admin/rounds"));
}

export async function updateRound(formData: FormData): Promise<void> {
  const admin = createAdminSupabaseClient();
  const locale = formLocale(formData);

  const roundId = formData.get("id") as string;
  if (!roundId) throw new Error("Missing round id");

  await admin.rpc("update_competition_round", {
    p_round_id: roundId,
    p_round_key: (formData.get("round_key") as string) || undefined,
    p_round_number: formData.get("round_number")
      ? parseInt(formData.get("round_number") as string)
      : undefined,
    p_labels: formData.get("labels")
      ? JSON.parse(formData.get("labels") as string)
      : undefined,
    p_display_order: formData.get("display_order")
      ? parseInt(formData.get("display_order") as string)
      : undefined,
    p_opens_at: (formData.get("opens_at") as string) || undefined,
    p_admin_closes_at: (formData.get("admin_closes_at") as string) || undefined,
    p_status: (formData.get("status") as string) || undefined,
    p_provider_metadata: formData.get("provider_metadata")
      ? JSON.parse(formData.get("provider_metadata") as string)
      : undefined,
    p_provider_review_status:
      (formData.get("provider_review_status") as string) || undefined,
  });

  revalidatePath("/admin/rounds");
  redirect(localePath(locale as never, `/admin/rounds/${roundId}?updated=1`));
}

export async function assignFixtureToRound(formData: FormData): Promise<void> {
  const admin = createAdminSupabaseClient();
  const locale = formLocale(formData);
  const roundId = formData.get("round_id") as string;
  const matchId = formData.get("match_id") as string;
  if (!roundId || !matchId) throw new Error("Missing round_id or match_id");

  await admin.rpc("assign_fixture_to_round", {
    p_match_id: matchId,
    p_round_id: roundId,
  });

  revalidatePath("/admin/rounds");
  redirect(
    localePath(locale as never, `/admin/rounds/${roundId}?assigned=1`)
  );
}

export async function unassignFixture(formData: FormData): Promise<void> {
  const admin = createAdminSupabaseClient();
  const locale = formLocale(formData);
  const matchId = formData.get("match_id") as string;
  if (!matchId) throw new Error("Missing match_id");

  await admin.rpc("unassign_fixture_from_round", {
    p_match_id: matchId,
  });

  revalidatePath("/admin/rounds");
  redirect(localePath(locale as never, "/admin/rounds"));
}

export async function markRoundReviewed(formData: FormData): Promise<void> {
  const admin = createAdminSupabaseClient();
  const locale = formLocale(formData);
  const roundId = formData.get("round_id") as string;
  if (!roundId) throw new Error("Missing round_id");

  await admin.rpc("mark_round_reviewed", {
    p_round_id: roundId,
    p_provider_review_status: "reviewed",
  });
  redirect(
    localePath(locale as never, `/admin/rounds/${roundId}?reviewed=1`)
  );
}

export async function closeRound(formData: FormData): Promise<void> {
  const admin = createAdminSupabaseClient();
  const locale = formLocale(formData);
  const roundId = formData.get("round_id") as string;
  if (!roundId) throw new Error("Missing round_id");

  await admin.rpc("close_round", {
    p_round_id: roundId,
  });

  revalidatePath("/admin/rounds");
  redirect(localePath(locale as never, "/admin/rounds"));
}
