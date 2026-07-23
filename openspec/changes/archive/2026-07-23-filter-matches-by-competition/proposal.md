## Why

The matches page for a competition queries `matches` with `select("*")` but without a `competition_id` filter. Since the `matches` table RLS policy allows public read, this means all matches from all competitions are fetched and shown — not just those belonging to the current league.

## What Changes

- Add `.eq("competition_id", <leagueId>)` to the matches query in the `[league]/matches` page

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `match-presentation`: The matches list for a competition SHALL only show matches belonging to that competition.

## Impact

- `app/[locale]/[league]/(public)/matches/page.tsx` — add competition filter to Supabase query
