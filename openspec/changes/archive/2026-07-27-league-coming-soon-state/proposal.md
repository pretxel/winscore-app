## Why

A league loaded into the system weeks before its start (like La Liga 2026–2027) is currently invisible to users in `manage` status, or immediately appears as fully "Active" once toggled — even if the tournament is still weeks away. Users have no way to discover or anticipate upcoming leagues. Adding a "Coming Soon" state for leagues at least 7 days from their start date lets users browse and get excited about upcoming competitions.

## What Changes

- Introduce a new `upcoming` league status, positioned between `manage` (hidden) and `active` (live)
- Leagues with `status = 'upcoming'` appear in the catalog with a "Coming Soon" badge, but their group/prediction features remain locked
- The status transition is admin-driven: a league can be set to `upcoming` when admins want to start teasing it (typically when `tournament_start_at` is at least 7 days away)
- The league's slug URL routes to a "Coming Soon" landing page or redirects to the catalog with a notice
- Groups cannot be created in an upcoming league; the form does not list it as a startable option

## Capabilities

### New Capabilities
- `league-lifecycle`: Covers the full league lifecycle including the new `upcoming` state — visibility rules, routing behavior, and the transition path (manage → upcoming → active → finished)

### Modified Capabilities
- `multi-league-pools`: Startable leagues list excludes `upcoming` status; catalog includes `upcoming` with a coming-soon badge; pool creation guard updated to reject `upcoming` leagues

## Impact

- `lib/competition.ts`: Add `upcoming` to status filters in queries (`listStartableLeagues`, `listCatalogLeagues`, `getLeagueBySlug`, `getActiveCompetition`)
- `app/[locale]/catalog/page.tsx`: Show "Coming Soon" badge for upcoming leagues (distinct from "Finished")
- `components/league-lane.tsx`: Hide "Start a group" for upcoming leagues
- `app/[locale]/[league]/layout.tsx`: Upcoming leagues should show a placeholder page rather than redirecting to catalog
- `app/[locale]/(admin)/admin/competitions/actions.ts`: Add `upcoming` to the setStatus enum
- `app/[locale]/(admin)/admin/competitions/page.tsx`: Show "Upcoming" badge in admin list
- `lib/groups.ts` / `app/[locale]/(app)/groups/actions.ts`: Pool creation guarded against upcoming leagues
- DB migration: Add `upcoming` to the competitions status CHECK constraint
- Locale files: Add "comingSoon" and error keys
