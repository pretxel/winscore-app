## Why

Winscore is multi-league: matches, standings, leaderboards, and pools are all scoped to a competition and live under `/[league]`. The Daily Call quiz is the last global feature — `quiz_questions` has one row per UTC day (`active_on` is globally unique), the public page fetches purely by `active_on = today`, and `v_quiz_leaderboard` aggregates every answer into one worldwide table. That means one shared question for all competitions and a single leaderboard that mixes La Liga, Liga MX, and World Cup players. To finish the multi-league model, the quiz must belong to a competition.

## What Changes

- **BREAKING (schema)**: `quiz_questions` gains a required `competition_id` (FK → `competitions`); the daily uniqueness constraint moves from `active_on` to `(competition_id, active_on)`, so each competition can have its own question per day. Existing rows are backfilled to the currently-active competition.
- Scope the quiz leaderboard and streak/standing by competition: `v_quiz_leaderboard` and `v_quiz_standing` aggregate per `(competition_id, user_id)` so each league has its own quiz ranking and streak.
- Expose `competition_id` through the public answer-omitting view `v_quiz_questions_public`; the `answer_quiz` SECURITY DEFINER function continues to grade by `question_id` (unchanged secret handling).
- Move the quiz UI under the league-scoped route (`/[league]/quiz`), resolving the competition via `getLeagueFromContext`, mirroring matches/standings. Fetch the day's question, leaderboard, and streak for that competition only.
- Admin quiz authoring selects the competition a question belongs to; listing/editing is competition-aware.
- Quiz reminder emails send the active competition's question (the reminder path already threads `leagueSlug`; scope its query by `competition_id`).
- Update the landing quiz feature card and any global `/quiz` entry point to route into the active/selected league's quiz.

## Capabilities

### New Capabilities
- (none — this extends existing quiz capabilities rather than introducing a new one)

### Modified Capabilities
- `daily-quiz`: Questions, answering, leaderboard, and streak become competition-scoped instead of global.
- `quiz-sharing`: The shared standing (rank/streak) reflects the competition's quiz, not a global one.
- `daily-quiz-email`: The reminder targets the recipient's/active competition's question.
- `multi-league-pools`: The quiz joins the league-scoped route surface under `/[league]`.

## Impact

- **DB**: new migration — add `quiz_questions.competition_id` + FK + `(competition_id, active_on)` unique; backfill existing rows; recreate `v_quiz_questions_public`, `v_quiz_leaderboard`, `v_quiz_standing` with competition scoping; RLS/grants preserved.
- **Routes**: add `app/[locale]/[league]/(public)/quiz/*`; retire/redirect the global `app/[locale]/(public)/quiz/*`.
- **Server/queries**: quiz page fetch, `answer` action, `lib/quiz.ts`, `lib/quiz-standing.ts`, leaderboard/standing reads filtered by competition.
- **Admin**: `app/[locale]/(admin)/admin/quiz/*` — competition selector + scoped listing.
- **Email**: `lib/notifications/quiz-reminder-emails.ts` query scoped by `competition_id`.
- **Landing/nav**: quiz links resolve to a league.
- **Tests**: quiz question/answer/leaderboard/streak, sharing, and reminder tests updated for competition scoping.
