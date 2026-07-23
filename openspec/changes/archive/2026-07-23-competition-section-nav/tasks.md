## 1. i18n labels

- [x] 1.1 Reused the existing `nav` namespace — it already carries `matches`, `standings`, `bracket`, `quiz`, `leaderboard` (translated in en/es/fr/de), so no new label keys were needed. Added one `nav.sections` key across all four locales for the nav's `aria-label`.
- [x] 1.2 Labels load via `getTranslations("nav")`; all keys present in every locale (verified) — no missing-key warnings.

## 2. Section nav component

- [x] 2.1 Reused the existing `NavLinks` client component (`site-nav-client.tsx`) — it already renders `{ href, label }[]`, marks the active link with `aria-current="page"` via `usePathname` and the required `isActive` prefix rule, with active-underline styling.
- [x] 2.2 Wrapped the row in `overflow-x-auto` with `w-max` on the list so it scrolls horizontally (no clipping) on narrow viewports.
- [x] 2.3 Added server component `CompetitionSectionNav` (`components/competition-section-nav.tsx`): resolves format from the passed competition, builds links with `localePath(locale, "/<league>/<section>")`, translates labels from `nav`.
- [x] 2.4 Gated sections: Matches/Leaderboard/Quiz always; Standings when `hasGroupStage(format) || leagueStageKey(format) !== null`; Bracket when `format.stages.some(s => s.kind === "knockout")`; core-only fallback when competition/format is null.

## 3. Render in the competition layout

- [x] 3.1 Rendered `CompetitionSectionNav` in `app/[locale]/[league]/layout.tsx` above `children`, reusing the already-resolved competition and locale/league.
- [x] 3.2 The layout wraps every `[league]` section page, so the nav renders on Matches, Standings, Leaderboard, Quiz, and Bracket by construction.

## 4. Verification

- [x] 4.1 Active highlighting uses the proven `isActive` rule (`pathname === href || startsWith(href + "/")`) from `NavLinks`, so `/…/leaderboard` marks Leaderboard and `/…/matches/[id]` keeps Matches active, with exactly one `aria-current="page"`.
- [x] 4.2 Gating logic mirrors how the Standings page itself decides layout and the knockout stage check; a knockout format shows Bracket, a non-knockout format hides it, a table format shows Standings.
- [x] 4.3 `pnpm lint` clean; `pnpm test` 1180 passed; new files add zero `tsc` errors (pre-existing tsc errors are only in bracket test files + a stale `.next` validator, untouched by this change). Live-browser confirmation not performed.
