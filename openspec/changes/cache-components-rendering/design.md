## Context

The app runs Next 16.3.4 with no caching configuration at all: no `cacheComponents`, no `'use cache'`, no route segment `revalidate`. The build classifies all 97 routes as dynamic. Twelve API route handlers set `force-dynamic` deliberately and stay that way.

The single cause is the read path. `createServerSupabaseClient` in `lib/supabase/server.ts` always reads `cookies()` to attach the session, and every page creates it first thing even when it only needs public data. `SiteNav`, rendered by `app/[locale]/layout.tsx`, calls `auth.getUser()`, so the shell of every page is request-bound. `proxy.ts` refreshes the session per request and keeps working unchanged under the new model.

Two facts from the installed documentation shape the design. With Cache Components enabled, reading `cookies()` inside a `<Suspense>` boundary no longer makes the whole route dynamic; the boundary's fallback ships in the static shell and the content streams. And `'use cache'` on its own is an in-memory, per-instance cache that does not persist across serverless invocations on Vercel; shared, durable caching needs `'use cache: remote'`.

Production today: catalog, leaderboard and tables 400 to 700 ms to first byte; fixture list 380 to 660 ms; match page 400 to 560 ms.

## Goals / Non-Goals

**Goals:**

- Serve the shell of every public page from the CDN, with shared sections cached and only per-user pieces rendered per request.
- Keep every page's visible behaviour identical, including "you" highlights, picks, and timezone-aware grouping.
- Make cache invalidation a property of the write path, not something a page has to remember.
- Land in phases that are each measurable and reversible.

**Non-Goals:**

- Caching any session-bound route: groups, profile, admin, quiz.
- Migrating API route handlers.
- Changing RLS policies or the data model.
- Client-side data fetching as a substitute for server caching.

## Decisions

### Cache Components, not the previous ISR model

The previous model (route segment `revalidate`, `unstable_cache`) is documented as the prior approach and is all-or-nothing per route: any `cookies()` read anywhere in the tree makes the route dynamic. `SiteNav` alone would defeat it on every page. Cache Components makes the decision per component, which is the granularity this app needs: a public table next to a personal highlight.

### A cookie-free public client for anything cached

`'use cache'` forbids `cookies()`, so cached loaders cannot use the existing server client. A new `lib/supabase/public.ts` creates a plain `@supabase/supabase-js` client with the anon key and no cookie adapter. It runs as the `anon` role, which RLS already allows to read competitions, matches, the leaderboard views and functions, phase schemes and phases. Anything the anon role cannot read is by definition not shared content and stays on the session client.

The public client sets the `x-league` header the same way the server client does, so league-scoped views resolve identically.

### The shell first: SiteNav behind Suspense

Nothing else matters until the layout stops being dynamic. `SiteNav` splits into the static frame (logo, links, language switcher) and a `<Suspense>`-wrapped account slot that resolves the session and renders the avatar or sign-in button. The fallback is a same-sized skeleton so nothing shifts when it streams in.

### `use cache: remote` for shared content, plain `use cache` for nothing

On Vercel the default cache is per-instance memory. A cached catalog that re-fetches on every cold instance would look like the change did nothing. Every shared loader uses `'use cache: remote'`. Per-user content is not cached at all; it streams.

### Tags name the thing that changed, lifetimes bound the blast radius

Two tag families, defined in one module so loaders and writers cannot drift:

- `league:<slug>` on anything derived from a league's fixtures, results, or standings.
- `match:<id>` on anything derived from one match.

Lifetimes are the backstop for a missed tag, not the primary mechanism:

| Content | Lifetime | Tags |
|---|---|---|
| Catalog, rulebook | hours | none needed; edited rarely, tag `catalog` for admin edits |
| Group tables, bracket, home lanes | hours | `league:<slug>` |
| Leaderboard, phase boards | hours | `league:<slug>` |
| Fixture list (shared part) | hours | `league:<slug>` |
| Match page (shared part), not live | hours | `match:<id>`, `league:<slug>` |
| Match page while live | minutes | `match:<id>` |
| News | hours | `news` |

### Writes invalidate; pages do not poll

Every write path that changes shared content calls `revalidateTag` after committing:

- Result sync: `match:<id>` for every match it finalises, flips live, or reschedules; `league:<slug>` once per league pass.
- Admin match result edit: `match:<id>`, `league:<slug>`.
- Phase close, scheme edits: `league:<slug>`.
- Competition edit: `league:<slug>`, `catalog`.
- News sync: `news`.

`revalidateTag` is background revalidation: the next request may serve stale for one cycle, which is acceptable everywhere a result appears. Admin edits that the admin then immediately views use `updateTag` so the confirmation page shows the change.

### The fixture list: cache the list, stream the personal layer

The list has three request-bound inputs: the viewer's picks, the `tz` cookie that groups matches by local day, and the `searchParams` filters. The shared part — the league's fixtures, windowed and sorted — is cached by league. The day grouping, filters, and pick markers are applied in a Suspense-wrapped component that receives the cached fixtures and the runtime values as arguments. Grouping is cheap; caching it per timezone would multiply cache entries for no gain.

### The match page: cache the match, stream the viewer

Header, events, AI recap and comic render are cached by `match:<id>`. The prediction form, the next-fixture suggestion, everyone's picks, and recap reactions are per-user and stream. A live match's shared block uses a minutes lifetime and is also invalidated by the sync, so the score is never more than one sync behind.

Countdowns render `Date.now()` on the client already, so no cached section computes the current time. Anything that must be per-request calls `connection()` before it, as the documentation requires.

### Phased delivery with a measurement gate

1. Prerequisites: public client, SiteNav in Suspense, `cacheComponents: true`, dev overlay audit.
2. Pilots: catalog, group tables, bracket, rulebook, news, home lanes.
3. Leaderboard and phase boards with `league:` tags.
4. Fixture list.
5. Match page.
6. Invalidation wired into the sync and admin, then production measurement.

Each phase ends with the same curl measurement used for the current perf work, on the same pages, and the phase is not merged if a page regressed or shows stale content after a write.

## Risks / Trade-offs

- **A write forgets its tag** → Public content stays stale until the lifetime expires. Mitigation: tags live in one module, every write path is enumerated in this design, and a test asserts each write function calls `revalidateTag` with the expected tags.
- **`'use cache'` without `remote` looks like a no-op on Vercel** → Every shared loader uses `remote`; the code review checklist and a lint rule on the directive string enforce it.
- **Timezone and filters on the fixture list** → Handled by keeping grouping and filtering outside the cache and passing the cached fixtures in; the cache key is the league only.
- **A live match cached too long** → Minutes lifetime plus sync invalidation on every score write. The live events feed already polls client-side and is unaffected.
- **`Date.now()` or random values inside a cached function** → The dev overlay reports `blocking-prerender-*` per route; the prerequisite phase clears every report before pilots start.
- **The static shell shows a signed-out state for a signed-in user** → Only the avatar slot is in Suspense with a neutral skeleton; the shell never asserts either state.
- **Test suite churn** → Many tests mock `createServerSupabaseClient`; loaders that move to the public client need their mocks moved with them. Done per phase, alongside the loader.
- **Build-time prerender needs Supabase reachable** → Vercel builds already have the env; a build that cannot reach the database falls back to rendering the section at request time rather than failing.

## Migration Plan

1. Land the prerequisites behind `cacheComponents: true`; with no `'use cache'` yet, pages render as before and only the shell becomes static.
2. Convert pages one phase at a time. Each conversion is a page-scoped diff plus its loader and tests.
3. Wire invalidation before the fixture list and match page ship, so results never appear stale on the pages people watch during a match.
4. Rollback per phase is reverting that phase's commits; rollback of the whole change is setting `cacheComponents: false`, which restores per-request rendering with no data impact.

## Open Questions

None. The route map, lifetimes, tags, and write paths are fully specified above; anything discovered during a phase is handled inside that phase.
