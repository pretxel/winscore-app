## 1. Prerequisites (unblocks every other phase)

- [x] 1.1 Record the baseline: production TTFB and payload for catalog, a group table, the bracket, news, the rulebook, the leaderboard, a fixture list, and a match page, using the curl method from the recent perf work, and store the table in the change folder
- [x] 1.2 Add `lib/supabase/public.ts`: a `@supabase/supabase-js` client with the anon key, no cookie adapter, and the same optional `x-league` header as the server client; add a unit test that it never imports `next/headers`
- [x] 1.3 Add `lib/cache-tags.ts` exporting `leagueTag(slug)`, `matchTag(id)`, and the fixed `catalog` and `news` tags, with tests for the exact strings
- [x] 1.4 Split `SiteNav` into a static frame and a Suspense-wrapped account slot with a same-sized skeleton fallback; verify no layout shift at desktop and mobile widths
- [x] 1.5 Set `cacheComponents: true` in `next.config.ts`; remove the 17 `export const dynamic = "force-dynamic"` route configs the flag rejects (every one of those routes still reads request data, so all stay dynamic on their own)
- [x] 1.5b Run the official `cache-components-instant-false` codemod to opt out the 41 not-yet-converted segments; later phases delete each `instant = false` as they convert its page
- [x] 1.6 Confirm `pnpm build` now marks the shell of public routes as prerendered and that all session-bound routes and the twelve `force-dynamic` API handlers are unchanged

## 2. Pilots: catalog, group tables, bracket, rulebook, news, home lanes

- [x] 2.1 Move each page's shared loader to the public client inside a `'use cache: remote'` function with a lifetime and the tags from `lib/cache-tags.ts` — done for catalog, group tables, league table, bracket, news, and the league roster and lane fixtures
- [x] 2.1b Give each loader a client-parameterised body (`fetchLeagueBySlug`, `fetchCatalogLeagues`, `fetchBracket`, `fetchGroupTables`, `fetchLeagueTable`) so the request-time and cached paths share one implementation and cannot drift
- [x] 2.1c Give the lane-fixtures strip a `minutes` lifetime rather than `hours`: it carries live scores
- [ ] 2.2 Home page: keep the viewer's own pools in a Suspense boundary on the session client and cache the public lanes — deferred, the home page is the one pilot that mixes per-user data
- [x] 2.3 Confirm the existing tests still pass; none of the converted loaders were mocked through `createServerSupabaseClient` in a way the change breaks
- [x] 2.4 Verify the five converted pages render identically to production, section for section
- [ ] 2.5 BLOCKED, needs its own phase: `app/layout.tsx` reads the request locale via `getLocale()` for `<html lang>`, outside any Suspense. That is runtime data in the root layout, so no route below it can prerender — `/_not-found` fails to build with the opt-out removed. Until the locale strategy is reworked, converted pages get cached data but not a static shell. Both layouts keep `instant = false`.
- [ ] 2.6 Measure the five pages in production against the baseline once deployed

## 3. Leaderboard and phase boards

- [x] 3.1 Cache the overall, week, stage, and phase rankings by league with `league:<slug>`; the "you" highlight is this viewer's id matched against the cached rows, so it needs no second query
- [x] 3.1b Compute the week's bounds outside the cached reader and pass them as arguments: a clock read inside `use cache` is evaluated once, and each week becomes its own cache entry
- [x] 3.1c Carry a read failure alongside the rows so the page can still tell "nobody has scored" from "the board could not load"
- [x] 3.1d Cache the default phase scheme and its phases, which the segment switcher reads on every visit
- [x] 3.2 Keep the realtime refetch on the overall board working against the cached initial rows
- [x] 3.3 Verify all four segments render identically to production
- [ ] 3.4 Measure the leaderboard and a phase board in production against the baseline once deployed

## 4. Fixture list

- [ ] 4.1 Cache the league's windowed, sorted fixtures by `league:<slug>` on the public client
- [ ] 4.2 Move day grouping, the status/round/picks filters, pick markers, and the timezone cookie read into a Suspense-wrapped component that receives the cached fixtures and the runtime values as arguments
- [ ] 4.3 Verify two requests with different `tz` cookies share one cache entry and group days differently
- [ ] 4.4 Confirm the closing-soon countdowns and the opportunistic sync trigger still behave; the sync trigger runs at request time, never inside the cache
- [ ] 4.5 Measure the fixture list for La Liga and Champions League in production against the baseline

## 5. Match page

- [ ] 5.1 Cache the header, events, AI recap, and comic render by `match:<id>` and `league:<slug>`, with `cacheLife('minutes')` while the match is live and `cacheLife('hours')` otherwise
- [ ] 5.2 Stream the prediction form, the next-fixture suggestion, everyone's picks, and recap reactions inside Suspense on the session client
- [ ] 5.3 Verify a signed-in and a signed-out render of a finished and an upcoming match match production section for section, as done for the recent parallel-loading change
- [ ] 5.4 Measure a finished and an upcoming match page in production against the baseline

## 6. Invalidation and final measurement

- [ ] 6.1 In the result sync, collect the ids of every match finalised, flipped live, or rescheduled during a pass and call `revalidateTag` for each `match:<id>` and once for `league:<slug>` after the writes; log and swallow invalidation failures
- [ ] 6.2 Replace `revalidatePath` in the admin result edit, phase close, scheme edits, and competition edit with `updateTag` on the affected tags so the admin's confirmation page is fresh
- [ ] 6.3 Add `revalidateTag('news')` to the news sync
- [ ] 6.4 Add tests asserting each write path calls invalidation with the expected tags, and that a pass with no writes invalidates nothing
- [ ] 6.5 Force a sync in production, then confirm the match page and leaderboard reflect the result without a redeploy
- [ ] 6.6 Re-measure every page from 1.1 and record the before/after table in the change folder
