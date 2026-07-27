## Why

The global site navigation includes a "Quiz" link that redirects to the active league's quiz page (`/quiz` → `/:league/quiz`). This is redundant — users already reach the quiz through the league section nav (Matches/Leaderboard/Quiz) on every league page. Removing it cleans up the top nav without losing functionality.

## What Changes

- Remove the `{ href: lp("/quiz"), label: t("quiz") }` entry from the nav links array in `site-nav.tsx`
- The `nav.quiz` locale key stays — it's still used by the league-scoped `CompetitionSectionNav`
- The legacy `/quiz` route redirect stays — it won't be linked from the nav but still works if accessed directly

## Capabilities

### New Capabilities
*(none)*

### Modified Capabilities
*(none — this is a UI-only change with no spec-level behavior changes)*

## Impact

- `components/site-nav.tsx`: Remove the quiz link entry from the `links` array
