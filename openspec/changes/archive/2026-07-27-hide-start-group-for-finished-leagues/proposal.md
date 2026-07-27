## Why

A finished league is still offered as somewhere to start a pool. The
`multi-league-pools` spec already forbids this — *"Leagues with `status` of
`manage` or `finished` SHALL NOT be startable"* — but the implementation does the
opposite: `listLiveLeagues()` selects `status in ('active', 'finished')` and its
result feeds the create-pool league picker directly.

The database is the only thing stopping it. `create_group()` raises
`'league is not active'`, and the action maps every RPC failure to a generic
`errorGeneric` toast. So a user can pick a finished league, name their pool, hit
create, and get an unexplained error — after doing all the work.

Nothing is broken today only because no competition has `status = 'finished'`
yet. The first league that finishes makes this reachable.

## What Changes

- Split the league catalog helper in two: one that lists leagues a pool can be
  started in (`active` only), and one that lists leagues to browse
  (`active` + `finished`, as today).
- Feed the create-pool picker from the startable list, so a finished league is
  never offered.
- Hide the "Start a group" call to action on a league lane whose competition has
  finished, and hide it on the home page when no league is startable at all.
- Map `create_group()`'s `'league is not active'` rejection to a specific,
  translated message rather than the generic error, so the race between an
  admin finishing a league and a user submitting the form explains itself.

## Capabilities

### New Capabilities

None. This makes the implementation match a requirement that already exists.

### Modified Capabilities

- `multi-league-pools`: the "Startable leagues list" requirement is unchanged in
  intent but gains scenarios covering the UI surfaces, since the current wording
  constrains the *list* without stating that the "Start a group" affordance must
  follow it. A new requirement covers the rejection message.

## Impact

- `lib/competition.ts` — split `listLiveLeagues()` into `listStartableLeagues()`
  (active only) and a browse-oriented list; audit both call sites.
- `app/[locale]/(app)/groups/page.tsx` — feed the form from the startable list.
- `components/league-lane.tsx` — hide "Start a group" for a finished league;
  needs the league's `status`, which `LeaguePools` does not currently carry.
- `lib/groups.ts` — add `status` to `LeaguePools`.
- `app/[locale]/page.tsx` — hide the empty-state "Start a group" when nothing is
  startable.
- `app/[locale]/(app)/groups/actions.ts` — distinguish the not-active rejection.
- `messages/{en,es,fr,de}.json` — one new error string.
- The cron jobs also call `listLiveLeagues()` and intentionally include finished
  leagues; that behavior must not change.
- No database or migration changes: `create_group()` already enforces this
  correctly.
