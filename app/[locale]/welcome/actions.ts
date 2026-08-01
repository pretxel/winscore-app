"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** The narrow slice of the Supabase client this module uses. */
type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        single: () => Promise<{ data: { welcome_seen_at: string | null } | null }>;
      };
    };
    update: (values: { welcome_seen_at: string }) => {
      eq: (
        col: string,
        val: string,
      ) => {
        is: (col: string, val: null) => Promise<{ error: unknown }>;
      };
    };
  };
};

/**
 * Records that the player finished (or skipped) the tour.
 *
 * Only writes when the column is null, so re-running the tour never moves the
 * original timestamp — it is the record of when the player was first shown the
 * rules, which matters more than when they last looked. The `.is()` filter
 * makes that guarantee hold even under a concurrent double submit.
 */
export async function recordWelcomeSeen(supabase: SupabaseLike, userId: string): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select("welcome_seen_at")
    .eq("id", userId)
    .single();

  if (data?.welcome_seen_at) return;

  await supabase
    .from("profiles")
    .update({ welcome_seen_at: new Date().toISOString() })
    .eq("id", userId)
    .is("welcome_seen_at", null);
}

export async function markWelcomeSeen(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  await recordWelcomeSeen(supabase as unknown as SupabaseLike, user.id);

  revalidatePath("/", "layout");
  redirect("/matches");
}
