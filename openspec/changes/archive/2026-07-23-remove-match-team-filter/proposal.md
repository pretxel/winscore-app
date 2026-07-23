## Why

The "Filter by team" control on the matches page adds cognitive load without meaningful utility in the multi-league experience. Each competition has its own dedicated matches page, and the team filter creates visual noise that complicates the match list without delivering proportional value.

## What Changes

- Remove the `MatchTeamFilter` component from the matches page
- Remove all team-filtering logic: `filterableTeams`, `matchInvolvesTeam`, `parseTeamParam`, `reconcileSelectedTeams`
- Remove the `?team=` query parameter handling from the matches page
- Update the round filter spacing so it doesn't leave a gap where the team filter was

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `match-team-filter`: **REMOVED** — the team filtering capability is removed entirely from the matches page.

## Impact

- `app/[locale]/[league]/(public)/matches/page.tsx` — remove team filter UI, state, and logic
- `components/match-team-filter.tsx` — delete the component (if not used elsewhere)
- `lib/match-utils.ts` — remove team-filter helpers (`filterableTeams`, `matchInvolvesTeam`, `parseTeamParam`, `reconcileSelectedTeams`)
