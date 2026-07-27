## Context

`components/competition-section-nav.tsx` decides whether to show the Bracket tab
with an inline predicate:

```ts
const showBracket = format ? format.stages.some((s) => s.kind === "knockout") : false;
```

That works: in production, `/es/la-liga-2026-2027/matches` renders no bracket
link while `/es/liga-mx-apertura-2026/matches` does.

The route has no equivalent guard. `bracket/page.tsx` calls `getBracket()` and
branches on the `hasKnockout` flag it returns. That flag is derived from
**fixtures** — `lib/bracket.ts` reports `hasKnockout: false` when the competition
resolves to no knockout matches — not from the competition's declared format. So
both of these produce the same empty state:

- La Liga: a league format that will never have a knockout stage.
- A knockout competition whose bracket fixtures have not been created yet.

Only the first should 404. Conflating them is what the current
`playoff-bracket` requirement does, and why `/es/la-liga-2026-2027/bracket`
returns 200 today.

## Goals / Non-Goals

**Goals:**

- `/<league>/bracket` 404s when the competition's *format* declares no knockout
  stage.
- The empty state survives for formats that can have a knockout but have no
  fixtures yet.
- The nav's visibility rule and the route's reachability rule are derived from
  one predicate, so they cannot drift apart again.

**Non-Goals:**

- Changing how brackets render, resolve slots, or refresh.
- Changing the Standings gate, which has its own (different) predicate.
- Redirecting instead of 404ing. A league competition has no bracket to redirect
  *to*, and a redirect would imply the URL means something.
- Backfilling knockout stages onto La Liga's format.

## Decisions

**Extract `hasKnockoutStage(format)` into `lib/competition-schema.ts`.**
That module already owns the format predicates the nav uses (`hasGroupStage`,
`leagueStageKey`), so it is the established home. The nav and the route then call
the same function. The alternative — duplicating `stages.some(...)` in the page —
is what allows the two to diverge, which is the bug being fixed.

**Guard with `notFound()`, not a redirect or a rendered 404.**
Next's `notFound()` from a server component produces a real 404 status and
renders the nearest `not-found` boundary. Search engines and shared links then
get an honest answer. A `redirect()` to `/matches` would be friendlier to a user
who clicked an old link, but it also makes the URL look valid and complicates
crawling; a 404 is the accurate statement that this competition has no bracket.

**Guard on the format, keep `hasKnockout` for the empty state.**
Two different questions deserve two different sources:

| Question | Source | Outcome |
| --- | --- | --- |
| Can this competition ever have a bracket? | `format.stages` | 404 if no |
| Does it have bracket fixtures right now? | `getBracket().hasKnockout` | empty state if no |

The guard runs before `getBracket()`, so a league competition also skips the
fixture query and the opportunistic-sync scheduling that follows it.

**Guard the page, not the layout.**
The `[league]` layout is shared by matches, standings, leaderboard, and quiz. A
guard there would need to know which child route is rendering. The page owns the
requirement, so the check belongs there.

**Unresolvable competition keeps rendering, not 404.**
When `getLeagueFromContext` returns null the format is unknown, and the nav
already degrades to hiding Bracket rather than asserting anything. The route
mirrors that: it renders the empty state rather than inventing a 404 from missing
data. A 404 here would turn a transient resolution failure into a hard error.

## Risks / Trade-offs

**A competition mis-declares its format and loses a bracket it should have** →
The predicate reads the same `format_config.stages` the nav already trusts for
this exact decision, so a format wrong enough to 404 the route is already wrong
enough to hide the tab. Both surfaces fail together and visibly, rather than one
silently disagreeing with the other.

**An existing shared or indexed bracket link starts 404ing** → Only for
league-only competitions. La Liga was activated on 2026-07-26 and has no bracket
link in its nav, so such a URL could only have been hand-constructed. The sitemap
never listed it.

**Someone re-adds an inline `stages.some(...)` check later** → The extracted
predicate is exported and used by both call sites, and the specs state the nav
and route share one rule, so a divergence is a spec violation rather than a
matter of taste.

## Migration Plan

Pure code change: no migration, no data backfill, no env vars. Ship with the next
deploy; roll back by reverting the commit. Nothing persists that would need
undoing.

## Open Questions

None. The behavior for each format is fully determined by the decisions above.
