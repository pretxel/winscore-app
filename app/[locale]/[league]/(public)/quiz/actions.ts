"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isCurrentUserAdmin } from "@/lib/admin/current-user";
import { DEFAULT_LOCALE, isLocale, localePath } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const schema = z.object({
  questionId: z.string().uuid(),
  choice: z.number().int().min(0).max(3),
  league: z.string().min(1),
  locale: z.string().min(2),
});

export type AnswerResult =
  | { ok: true; isCorrect: boolean; correctIndex: number }
  | { ok: false; error: "invalid" | "not-signed-in" | "already-answered" | "blocked" | "failed" };

/**
 * Submit an answer to the league's question for today. Grading happens entirely
 * in the answer_quiz RPC (SECURITY DEFINER) — the client never sees the correct
 * option until this returns, the RPC stamps the answer with the question's
 * competition, and a second answer is rejected by the unique constraint
 * surfaced as 23505.
 */
export async function submitQuizAnswer(input: unknown): Promise<AnswerResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not-signed-in" };

  // Admins are operators, not contestants — reject server-side regardless of
  // the (disabled) client options.
  if (await isCurrentUserAdmin(supabase)) return { ok: false, error: "blocked" };

  const { data, error } = await supabase.rpc("answer_quiz", {
    p_question_id: parsed.data.questionId,
    p_choice: parsed.data.choice,
  });

  if (error) {
    if (error.code === "23505" || /duplicate key|unique/i.test(error.message)) {
      return { ok: false, error: "already-answered" };
    }
    return { ok: false, error: "failed" };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: "failed" };

  const locale = isLocale(parsed.data.locale) ? parsed.data.locale : DEFAULT_LOCALE;
  revalidatePath(localePath(locale, `/${parsed.data.league}/quiz`));

  return { ok: true, isCorrect: !!row.is_correct, correctIndex: row.correct_index };
}
