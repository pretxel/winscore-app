"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Marks the tour as seen and sends the player to the app.
 *
 * The `.is("welcome_seen_at", null)` filter is the idempotency guarantee:
 * concurrent submits or stepping backward through the tour never overwrite
 * the original timestamp, which records when the player was first shown
 * the rules.
 */
export async function markWelcomeSeen(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  await supabase
    .from("profiles")
    .update({ welcome_seen_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("welcome_seen_at", null);

  revalidatePath("/", "layout");
  redirect("/matches");
}
