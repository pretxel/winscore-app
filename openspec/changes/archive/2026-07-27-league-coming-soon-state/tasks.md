## 1. Database: Add `upcoming` status

- [x] 1.1 Create migration adding `upcoming` to the competitions status CHECK constraint and update existing constraints
- [x] 1.2 Run `supabase gen types` to regenerate TypeScript types

## 2. Query helpers: Update `lib/competition.ts`

- [x] 2.1 Update `listCatalogLeagues()` to include `status = 'upcoming'` alongside `active` and `finished`
- [x] 2.2 Update `listStartableLeagues()` to exclude `upcoming` (alongside `manage` and `finished`)
- [x] 2.3 Update `getLeagueBySlug()` to allow `upcoming` leagues through (skip redirect for upcoming)
- [x] 2.4 Verify `getActiveCompetition()` still queries only `status = 'active'` (no change needed)

## 3. UI: Catalog badge

- [x] 3.1 Add `catalog.comingSoon` i18n key to `messages/en.json` and the other 3 locale files
- [x] 3.2 Render "Coming Soon" badge for `league.status === 'upcoming'` in `catalog/page.tsx` (accent-style, distinguishable from "Finished" and "Live")
- [x] 3.3 Hide "Start" button for upcoming leagues in the catalog list

## 4. UI: League lane (signed-in home)

- [x] 4.1 Add `leagueLane.comingSoon` i18n key to all locale files (optional badge text)
- [x] 4.2 Hide "Start a group" link in `league-lane.tsx` for `lane.status === 'upcoming'`

## 5. Routing: Upcoming league pages

- [x] 5.1 Update `[league]/layout.tsx` so upcoming leagues render children instead of redirecting to catalog
- [x] 5.2 Create a coming-soon placeholder component/page for upcoming league routes that shows a "Coming soon" message

## 6. Admin: Set upcoming status

- [x] 6.1 Add `upcoming` to the `z.enum()` in `admin/competitions/actions.ts` `setStatus` function
- [x] 6.2 Add `competitions.badgeUpcoming` i18n key to all locale files
- [x] 6.3 Render "Coming Soon" badge for `c.status === 'upcoming'` in `admin/competitions/page.tsx`

## 7. Verify

- [x] 7.1 Run `tsc --noEmit` and fix type errors
- [x] 7.2 Run `biome check` and fix lint/format issues
- [x] 7.3 Run `vitest run` and ensure existing tests pass
