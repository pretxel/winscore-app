## Why

La Liga 2026-27 is a pure league format (one `league` stage, 38 matchdays, no
knockout). Its Bracket tab is already correctly hidden from the section nav, but
`/<locale>/la-liga-2026-2027/bracket` still returns **HTTP 200** and renders a
"no knockout yet" empty state. A page that exists only to say it has nothing is a
dead end: it is reachable from search engines, shared links, and browser history,
and it advertises a competition capability that will never materialise for this
format.

The nav gate and the route disagree, and the route is the one that is wrong.

## What Changes

- Return **404** from `/<league>/bracket` when the resolved competition's format
  declares no knockout stage, instead of rendering an empty state.
- Keep the empty state for competitions whose format **does** include a knockout
  stage but whose knockout fixtures have not been created or confirmed yet — that
  is a legitimate "not yet" and must not 404.
- **BREAKING** for `playoff-bracket`: its current requirement says the page SHALL
  render an empty state rather than a 404 whenever no knockout fixtures exist.
  That conflates two distinct cases. The requirement is narrowed to cover only
  formats that can have a knockout.

## Capabilities

### New Capabilities

None. This tightens existing behavior rather than adding a capability.

### Modified Capabilities

- `playoff-bracket`: the "graceful handling when no knockout stage exists"
  requirement is split by cause. A format that *can* have knockout fixtures but
  has none yet still renders the empty state; a format that *cannot* have them at
  all now 404s. A second requirement is added stating that the route's
  reachability and the nav's visibility derive from the same format predicate.

`competition-section-nav` is deliberately **not** modified: its existing
"Bracket SHALL appear only when the competition format contains a knockout stage"
requirement is already correct and already satisfied. `competition-format` is not
modified either — it governs format storage and validation, not UI surfaces.

## Impact

- `app/[locale]/[league]/(public)/bracket/page.tsx` — add the format guard via
  `notFound()`.
- `app/sitemap.ts` — no change needed; it lists only static, unscoped routes and
  never emits `/<league>/bracket`.
- `components/competition-section-nav.tsx` — no behavior change, but its
  `showBracket` predicate should be extracted so the nav and the route cannot
  drift apart again.
- `lib/competition-schema.ts` — home for the shared `hasKnockoutStage(format)`
  predicate.
- Affects La Liga 2026-27 today. Liga MX and World Cup both declare knockout
  stages and are unaffected.
- No database, API, or dependency changes.
