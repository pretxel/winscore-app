## 1. Database migration

- [x] 1.1 New migration: add nullable `quiz_questions.competition_id uuid` and nullable `quiz_answers.competition_id uuid`
- [x] 1.2 Backfill: `quiz_questions.competition_id` from the active competition (`competitions where is_active`; assert exactly one, else fail loudly); `quiz_answers.competition_id` from each answer's `question_id`
- [x] 1.3 Set both `competition_id` `not null` + FK `references competitions(id)`; drop the `active_on` unique constraint and add unique `(competition_id, active_on)` on `quiz_questions`; index `quiz_answers (competition_id, user_id)`
- [x] 1.4 Modify `answer_quiz` SECURITY DEFINER fn to read the question's `competition_id` and set it on the inserted `quiz_answers` row (grading contract unchanged; base-table SELECT stays revoked)
- [x] 1.5 Recreate `v_quiz_questions_public` to also select `competition_id` (keep `security_invoker = off`, re-grant to anon/authenticated)
- [x] 1.6 Recreate `v_quiz_leaderboard` grouping/output by `(competition_id, user_id)` straight from `quiz_answers`; re-grant
- [x] 1.7 Recreate `v_quiz_standing` scoped by `quiz_answers.competition_id` (streak per competition); re-grant

## 2. League-scoped quiz route

- [x] 2.1 Add `app/[locale]/[league]/(public)/quiz/` (page, actions, answer-card, loading) resolving `getLeagueFromContext({ slug })`; 404/redirect to catalog when unavailable
- [x] 2.2 Scope the question fetch by resolved `competition_id` + `active_on = today`; empty state when none
- [x] 2.3 Scope leaderboard + streak reads (`lib/quiz.ts`, `lib/quiz-standing.ts`) by `competition_id`
- [x] 2.4 Redirect legacy `app/[locale]/(public)/quiz` → active competition's `/[league]/quiz` (or catalog); remove/retire the global page
- [x] 2.5 Update landing quiz feature card + any nav quiz link to resolve to a league

## 3. Admin authoring

- [x] 3.1 Add a competition selector to admin quiz create/edit (`app/[locale]/(admin)/admin/quiz/*`)
- [x] 3.2 Scope admin listing by competition; enforce `(competition_id, active_on)` uniqueness with a clear validation error on duplicate

## 4. Quiz reminder emails

- [x] 4.1 Scope the day's-question query in `lib/notifications/quiz-reminder-emails.ts` by the competition (resolve from `leagueSlug`); skip competitions with no question today
- [x] 4.2 Deep-link the reminder CTA to `/[league]/quiz`

## 5. Quiz sharing

- [x] 5.1 Expose `competition_id` through `v_quiz_standing`; scope the share landing page + OG card by competition
- [x] 5.2 Point the share CTA + share URL at the competition's `/[league]/quiz`

## 6. Tests & verification

- [x] 6.1 Update quiz tests: question/answer/leaderboard/streak scoped per competition; two-competition isolation
- [x] 6.2 Update quiz-sharing and quiz-reminder tests for competition scoping + league deep links
- [x] 6.3 `tsc --noEmit` clean, full `vitest` suite green
- [ ] 6.4 Apply migration to a local/branch DB and smoke-test `/[league]/quiz` end-to-end (question, answer, leaderboard, streak)
