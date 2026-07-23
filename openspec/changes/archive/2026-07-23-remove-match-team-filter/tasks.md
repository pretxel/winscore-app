## 1. Remove team filter from matches page

- [x] 1.1 Remove `MatchTeamFilter` import and JSX from `app/[locale]/[league]/(public)/matches/page.tsx`
- [x] 1.2 Remove team-filter logic: `filterableTeams`, `matchInvolvesTeam`, `parseTeamParam`, `reconcileSelectedTeams` imports and usage
- [x] 1.3 Remove `team` param from `searchParams` destructuring
- [x] 1.4 Remove `teamFiltered`/`selectedTeams`/`selectedKeys` pipeline — `scoped` becomes the unfiltered `list`
- [x] 1.5 Verify round filter, status filter, and picks filter still work correctly

## 2. Clean up dead code

- [x] 2.1 Check if `MatchTeamFilter` is imported elsewhere; delete component file if unused
- [x] 2.2 Check if `filterableTeams`, `matchInvolvesTeam`, `parseTeamParam`, `reconcileSelectedTeams` have other callers in `lib/match-utils.ts`; remove if unused
- [x] 2.3 Run typecheck (`npm run typecheck`) and verify no broken imports

## 3. Update specs

- [x] 3.1 Remove team-filter-related i18n strings from locales if no longer referenced
- [x] 3.2 Verify the matches page renders correctly with existing filters (status, round, picks) and no regressions
