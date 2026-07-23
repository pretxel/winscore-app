## Context

The Daily Call quiz (`supabase/migrations/20260606000000_daily_quiz.sql`) is the only remaining global feature. Its schema hard-codes globalness: `quiz_questions.active_on` is `unique` (one question per day for the whole product), the public page (`app/[locale]/(public)/quiz/page.tsx`) fetches `v_quiz_questions_public` by `active_on = today`, and `v_quiz_leaderboard` / `v_quiz_standing` aggregate every `quiz_answers` row into a single worldwide ranking and streak. Meanwhile pools, matches, standings, and leaderboards already resolve a competition via `getLeagueFromContext({ slug })` under `app/[locale]/[league]/…`.

Secret-answer handling is load-bearing and must be preserved: base-table SELECT is revoked from `anon/authenticated`, the answer-omitting view `v_quiz_questions_public` runs `security_invoker = off`, and grading goes through the `answer_quiz` SECURITY DEFINER function so `correct_index` is only disclosed after an answer is written. Quiz question translations (es/fr/de) and the streak algorithm (`lib/quiz.computeStreak`, gaps-and-islands in `v_quiz_standing`) must keep working.

## Goals / Non-Goals

**Goals:**
- Each competition owns its own daily question, quiz leaderboard, and streak.
- The quiz lives under `/[league]/quiz`, resolved like every other league-scoped surface.
- Preserve the secret-answer guarantees, translations, one-shot grading, and streak semantics exactly.
- Backfill existing questions/answers into the currently-active competition so no history is lost.

**Non-Goals:**
- No change to the points value (10/correct) or ranking/tiebreak rules — only the aggregation scope.
- No cross-league combined quiz leaderboard (each league is independent; a global view can come later if wanted).
- No change to `answer_quiz`'s grading contract or the translation schema.
- No auth/RLS model change beyond adding the competition column to the existing views.

## Decisions

- **Add `competition_id uuid not null references competitions(id)` to `quiz_questions`; move uniqueness to `(competition_id, active_on)`.** Questions already carry the day; the competition is the missing axis. Answering stays keyed by `question_id`, so `answer_quiz` needs no scoping logic — the question already implies its competition. *Alternative* — a separate `quiz_questions_by_league` table — rejected as needless duplication; one table with a scoping column matches how matches/results are modeled.
- **Backfill to the active competition.** In the migration, set `competition_id` on existing rows to the row from `competitions where is_active` (the world-cup-2026 seed), then add the `not null` + FK. Existing `quiz_answers` inherit their competition transitively through `question_id`, so no answer backfill is needed. *Alternative* — drop history — rejected; the current streak/leaderboard would reset.
- **Denormalize `competition_id` onto `quiz_answers` too.** The quiz page computes streak/points client-side from the owner's `quiz_answers`, but the base `quiz_questions` SELECT is revoked from `anon/authenticated` (secret-answer protection), so the app cannot join answers → questions to read the competition. So `quiz_answers` gains its own `competition_id` (FK), backfilled from each answer's question and set inside the `answer_quiz` SECURITY DEFINER function on insert (the function already reads the question). The app then filters answers by `competition_id` directly. *Alternative* — expose the competition through the answer-omitting view and join in-app — rejected; still can't reach the FK without granting base-table reads.
- **Scope the views off `quiz_answers.competition_id`.** With the column denormalized, `v_quiz_leaderboard` and `v_quiz_standing` group by `(competition_id, user_id)` straight from `quiz_answers` (no question join); callers filter by the resolved league's competition. `v_quiz_questions_public` also selects `competition_id`. The views keep `security_invoker = off`. *Alternative* — parameterized SQL functions — rejected; the app already reads these as filterable views.
- **Route: add `app/[locale]/[league]/(public)/quiz/*`, redirect the old global `/quiz`.** Mirror `matches`/`standings`: resolve `getLeagueFromContext({ slug })`, 404/redirect to the catalog when the league is unavailable. The legacy `/[locale]/quiz` redirects to the active/most-relevant league's quiz (same pattern as the other legacy redirects in `multi-league-pools`). *Alternative* — keep `/quiz` global and add a competition query param — rejected; inconsistent with the rest of the app and its route conventions.
- **Reminders scope by `competition_id`.** `lib/notifications/quiz-reminder-emails.ts` already threads `leagueSlug`; resolve it to a competition and filter the day's question by `competition_id`, and deep-link to `/[league]/quiz`.

## Risks / Trade-offs

- [Backfill picks the wrong competition if multiple are `is_active`] → The seed has a single active competition; assert exactly one in the migration (or pick the world-cup-2026 slug explicitly) and fail loudly otherwise.
- [View recreation changes column order / breaks a consumer] → Recreate with `create or replace view` preserving existing columns and appending `competition_id`; run the quiz/sharing/leaderboard test suites.
- [Legacy `/quiz` links in emails/OG/shares 404] → Keep a redirect from the global route; update the reminder deep link and share URLs to the league route.
- [`answer_quiz` "active today" check across competitions] → The check is per-question (`q.active_on = today`); multiple competitions each having a question today is fine — each answer targets one question id.

## Migration Plan

1. Migration: add `competition_id` (nullable) → backfill from the active competition → set `not null` + FK → swap unique constraint to `(competition_id, active_on)`.
2. Recreate `v_quiz_questions_public`, `v_quiz_leaderboard`, `v_quiz_standing` with `competition_id`; re-grant.
3. Add `/[league]/quiz` route + scoped queries in `lib/quiz.ts` / `lib/quiz-standing.ts`; redirect legacy `/quiz`.
4. Admin authoring: competition selector + scoped listing.
5. Reminder email: scope by competition, deep-link to league route.
6. Landing/nav quiz links → league route; update tests.

Rollback: revert the app changes and ship a down-migration that drops `competition_id` and restores the global views/unique constraint. Answers are untouched, so rollback loses only the scoping.

## Open Questions

- Legacy `/quiz` target: redirect to the active competition, or to a league picker? Default: active competition, falling back to the catalog when none is active.
- Should the quiz nav entry appear only when a league context exists, or always route to a default league? Resolve during route implementation.
