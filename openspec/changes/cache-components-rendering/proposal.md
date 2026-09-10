## Why

Every one of the app's 97 routes renders on demand, including the ones whose content is identical for every visitor: the league catalog, group tables, the bracket, the leaderboard, news, and the rulebook. Measured in production, those pages spend 400 to 700 ms before the first byte, all of it request-time rendering plus a round trip to Supabase in West Europe. The optimisation work so far shortened that render; it cannot remove it, because the pages are structurally dynamic.

They are dynamic for one reason. The server Supabase client reads `cookies()` for the session and every page creates it on entry, and the site navigation in the root layout calls `auth.getUser()`, so even the page shell is rebuilt per request. Next 16 ships a rendering model built for exactly this situation: a static shell served from the CDN, shared sections cached with a lifetime, and only the per-user pieces streamed in. Adopting it is the remaining step change available to public pages.

## What Changes

- Enable **Cache Components** (`cacheComponents: true`), making Partial Prerendering the rendering model for the app.
- Add a **cookie-free public Supabase client** for anonymous reads, so shared data can be fetched inside cached functions, which cannot touch `cookies()`.
- Wrap the **site navigation in Suspense** with an avatar skeleton, so the session check no longer forces every route's shell to render per request.
- Convert the **public pages** to cached sections with tags and lifetimes: catalog, group tables, bracket, news, rulebook, home lanes, then the leaderboard and phase boards, then the fixture list, then the match page. Per-user content on each stays dynamic behind Suspense.
- Make **writes invalidate what they change**: the result sync and the admin actions tag their writes by league and by match, replacing the current path-based revalidation.
- Use **`use cache: remote`** for shared content, because the default cache is per-instance memory and does not survive between serverless invocations on Vercel.
- Ship in **six measured phases**, each verified against production before the next; any phase can stop without leaving the app in a worse state.

Session-bound routes (groups, profile, admin, quiz) and the API route handlers are unchanged. RLS, the data model, and the visible behaviour of every page are unchanged.

## Capabilities

### New Capabilities

- `cache-components-rendering`: the rendering model — which content is static, cached, or streamed on each public page, the cache lifetimes and tags, the cookie-free read path, and the invalidation contract that writes must honour.

### Modified Capabilities

- `automated-results`: after a result is written or a kickoff reconciled, the sync SHALL invalidate the affected league and match caches so the public pages reflect the change within the cache's stale window.

## Impact

- **Config:** `cacheComponents: true` in `next.config.ts`.
- **Library:** new `lib/supabase/public.ts`; cached data loaders for catalog, standings, bracket, news, leaderboard, fixture list, and match page; a shared tag naming module.
- **Layout and components:** `SiteNav` behind Suspense with a skeleton; per-user sections of public pages moved into Suspense boundaries.
- **Writes:** `revalidateTag` calls in the result sync, phase close, competition edit, and match result actions.
- **Tests:** existing tests mock the cookie-bound client; loaders that move to the public client need their mocks updated. New tests for tag naming and for the invalidation calls.
- **Operations:** a missing tag on a write means stale public content until the lifetime expires. The design lists every write path and its tags so this is auditable.
- **Measurement:** production TTFB per page before and after each phase, using the same curl method as the current perf work.
