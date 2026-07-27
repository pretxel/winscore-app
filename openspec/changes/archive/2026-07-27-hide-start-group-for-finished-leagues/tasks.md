## 1. Split the league catalog helpers

- [x] 1.1 Add `listStartableLeagues()` to `lib/competition.ts` selecting only `status = 'active'`, returning the existing `LeagueCatalogEntry` shape
- [x] 1.2 Rename `listLiveLeagues()` to `listCatalogLeagues()`, keeping its `status in ('active','finished')` filter and its comment explaining why finished leagues are included
- [x] 1.3 Update the four call sites that legitimately want finished leagues to the new name: `app/[locale]/catalog/page.tsx`, `app/[locale]/(admin)/admin/quiz/page.tsx`, `lib/cron/for-each-league.ts`, `components/tournament-countdown.tsx`
- [x] 1.4 Add unit tests covering both helpers: startable excludes `finished` and `manage`; catalog includes `finished` but excludes `manage`

## 2. Gate the create-pool picker

- [x] 2.1 Switch `app/[locale]/(app)/groups/page.tsx` to `listStartableLeagues()`
- [x] 2.2 Confirm the existing `noLiveLeagues` message still renders when the startable list is empty (`group-forms.tsx` already handles `leagues.length === 0`)

## 3. Hide the affordance where it would dead-end

- [x] 3.1 Add `status` to the `LeaguePools` type in `lib/groups.ts` and populate it from the joined competition in `listMyPoolsByLeague()`
- [x] 3.2 In `components/league-lane.tsx`, omit the "Start a group" link when `lane.status !== "active"`, leaving the lane's pools and "All fixtures" link intact
- [x] 3.3 In `app/[locale]/page.tsx`, hide the empty-state "Start a group" call to action when no league is startable
- [x] 3.4 Add a test asserting a finished league's lane renders its pools but no start control, and an active league's lane renders both

## 4. Explain the rejection

- [x] 4.1 Add a `errorLeagueNotActive` message to `messages/en.json` and translate it in `es`, `fr`, and `de`
- [x] 4.2 In `app/[locale]/(app)/groups/actions.ts`, return that key when `create_group()` fails with the not-active rejection, falling back to `errorGeneric` for every other error
- [x] 4.3 Add a test that the not-active rejection maps to the specific key and an unrelated failure still maps to `errorGeneric`

## 5. Verification

- [x] 5.1 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test` — all must pass
- [x] 5.2 Temporarily set one competition to `status = 'finished'` on a local or preview database and confirm: it is absent from the create-pool picker, its lane shows pools but no start control, and it still appears in the catalog
- [x] 5.3 With that competition still finished, submit a create-pool request against it directly and confirm the specific message appears rather than the generic error
- [x] 5.4 Restore the competition's original status and confirm the start control returns
