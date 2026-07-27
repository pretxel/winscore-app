## 1. Shared predicate

- [x] 1.1 Add and export `hasKnockoutStage(format)` in `lib/competition-schema.ts`, alongside the existing `hasGroupStage` / `leagueStageKey` predicates, returning true when any stage has `kind === "knockout"`
- [x] 1.2 Replace the inline `format.stages.some((s) => s.kind === "knockout")` in `components/competition-section-nav.tsx` with a call to `hasKnockoutStage`, keeping the existing null-format fallback behavior
- [x] 1.3 Add unit tests for `hasKnockoutStage`: knockout format true, league-only format false, group-only format false, and a format with no stages false

## 2. Route guard

- [x] 2.1 In `app/[locale]/[league]/(public)/bracket/page.tsx`, call `notFound()` when the competition resolves and `hasKnockoutStage(competition.format)` is false — before `getBracket()` runs, so the fixture query and opportunistic sync are skipped
- [x] 2.2 Confirm an unresolvable competition (null) still falls through to the existing empty state rather than 404ing, per the spec scenario
- [x] 2.3 Apply the same guard in `generateMetadata` so a league-only competition does not emit bracket metadata for a page that 404s

## 3. Verification

- [x] 3.1 Add a test asserting the nav and the route agree: for a league-only format both the nav link is absent and the guard predicate is false; for a knockout format both are present/true
- [x] 3.2 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test` — all must pass
- [x] 3.3 Verify locally that `/es/la-liga-2026-2027/bracket` returns 404 and `/es/liga-mx-apertura-2026/bracket` still returns 200 with its bracket
- [x] 3.4 Verify `/es/world-cup-2026/bracket` is unaffected (knockout format, renders as before)
- [x] 3.5 After deploying, re-check the same three URLs in production
