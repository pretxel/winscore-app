## Context

The global site navigation (`components/site-nav.tsx`) currently links to `/quiz`, which redirects to the active league's quiz page. The quiz is also accessible from the league section nav on every `/[league]` page. This duplication adds unnecessary noise to the global nav.

## Goals / Non-Goals

**Goals:**
- Remove the "Quiz" link from the global site navigation bar

**Non-Goals:**
- Removing the legacy `/quiz` route or its redirect behavior
- Removing the quiz link from the league-scoped section nav (`CompetitionSectionNav`)
- Any changes to admin nav, mobile nav behavior, or structure
- Removing the `nav.quiz` locale key (still used by `CompetitionSectionNav`)

## Decisions

**1. Keep the legacy `/quiz` route**
The redirect page at `app/[locale]/(public)/quiz/page.tsx` stays live. Removing it would create a dead link for anyone who has bookmarked `/{locale}/quiz` or follows an external reference. Not removing it from the nav costs nothing but avoids breakage.

**2. No locale key changes**
The `nav.quiz` key is still referenced by `CompetitionSectionNav`, so it must remain in all locale files.

## Risks / Trade-offs

*(none)*
