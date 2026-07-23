## Context

The matches page (`app/[locale]/[league]/(public)/matches/page.tsx`) currently includes a `MatchTeamFilter` component above the match list. It reads `?team=` from URL search params and filters matches to show only those involving selected teams. With dedicated per-competition pages and the emergence of multi-league pools, the team filter adds unnecessary complexity to both the UI and the codebase.

Related components and utilities:
- `components/match-team-filter.tsx` — the filter UI chip group
- `lib/match-utils.ts` — `filterableTeams()`, `matchInvolvesTeam()`, `parseTeamParam()`, `reconcileSelectedTeams()`

## Goals / Non-Goals

**Goals:**
- Remove the team filter UI and all associated logic from the matches page
- Clean up unused exports from `lib/match-utils.ts`
- Delete `match-team-filter.tsx` if it has no other consumers
- Maintain existing filter behavior (status, round, picks) unchanged

**Non-Goals:**
- Changing any other filter components
- Modifying the match list rendering or grouping logic
- Updating the match detail page
- Adding any new filtering capability

## Decisions

**Clean removal over feature flag.** Since this is a single-page UI removal with no API dependencies, a flag adds complexity for no benefit. The team filter has no persistent state beyond URL params — removing the UI and dropping the param handler is sufficient.

**Delete component file if unused.** A grep for `MatchTeamFilter` imports across the app will confirm it has no other consumers before deletion. If any other page imports it, we keep the file and only remove the import from the matches page.

**Strip util functions used only by the team filter.** `filterableTeams`, `matchInvolvesTeam`, `parseTeamParam`, and `reconcileSelectedTeams` are checked for other callers before removal. Any shared helpers stay.

## Risks / Trade-offs

- **Users who bookmarked filtered URLs** (e.g., `?team=América`) will silently see unfiltered results → Acceptable trade-off; the filter was rarely used at match-list scale and the URL param will simply be ignored.

## Migration Plan

1. Remove `MatchTeamFilter` import and JSX from matches page
2. Remove team-filter logic (scoped/teamFiltered pipeline) from matches page
3. Check for other consumers of `MatchTeamFilter` and the util functions
4. Delete dead code if none found
5. Deploy — no data migration needed
