## Context

Every competition lives under `/[locale]/[league]/…` and already ships five sections as separate routes: `matches`, `standings`, `bracket` (under `(public)`), `leaderboard`, `quiz`, plus `my-picks` under `(app)`. `[league]/layout.tsx` validates the slug via `getLeagueFromContext` (request-cached) and renders `children`; it holds no UI. Cross-section movement today is ad hoc — links from home lanes, the catalog, and per-page CTAs — so once a visitor is on Matches there is no consistent way to reach Standings, Leaderboard, Quiz, or Bracket.

The app already has two navigation patterns to follow: `site-nav.tsx` (server) + `site-nav-client.tsx` (client `NavLinks`/`MobileNav`, active state via `usePathname` and `aria-current`), and `admin-nav.tsx`. Competition format is described by `format_config` (`lib/competition-schema.ts`) with helpers `hasGroupStage`, `leagueStageKey`, and `sortedStages`; stage `kind` is one of `group | knockout | league`.

## Goals / Non-Goals

**Goals:**
- One persistent, competition-scoped section nav on every page under `[league]`.
- Sections: Matches, Standings, Leaderboard, Quiz, Bracket — each linking to its existing route.
- Correct active-section highlighting with `aria-current="page"`.
- Conditional visibility by format: Bracket only when a knockout stage exists; Standings only when a group or league table exists. Leaderboard, Quiz, Matches always shown.
- Mobile-first, responsive; reuse existing nav styling idioms.

**Non-Goals:**
- No change to the section pages' own behavior, data, or routes.
- No new "hub"/index page and no embedded previews (explicitly deferred; user chose the tab-bar approach).
- `my-picks` (auth-only, under `(app)`) is out of scope for this nav.
- No new i18n keys beyond the section labels.

## Decisions

**Render the nav from `[league]/layout.tsx`.** The layout already resolves the competition and wraps every section page, so it is the single insertion point that guarantees the nav on all sections without touching each page. Alternative — adding it per page — was rejected: five duplicate call sites, easy to drift.

**Server component computes the link set; a thin client child owns active state.** Mirror `site-nav` split: the server piece (`CompetitionSectionNav`) reads the resolved competition, builds the `{ href, label, section }[]` list (gating by format, resolving `localePath(locale, "/<league>/<section>")`, translating labels), and passes it to a `"use client"` list component that uses `usePathname` for the active underline and `aria-current`. Reuse the existing `isActive` semantics (`pathname === href || startsWith(href + "/")`) so `matches/[matchId]` keeps Matches active. Rationale: active state needs the client hook, everything else stays server-rendered and cache-friendly.

**Format gating uses the existing pure helpers.** Standings shown when `hasGroupStage(format) || leagueStageKey(format) !== null` (matches how the Standings page itself decides its layout). Bracket shown when `sortedStages(format).some((s) => s.kind === "knockout")`. If the competition or its format cannot be resolved, fall back to the always-on sections (Matches, Leaderboard, Quiz) rather than erroring. Rationale: keeps the nav honest — no tab that dead-ends on an empty/redirecting page.

**i18n labels under a new `competitionNav` namespace** (or reuse existing `nav`/page-title keys if labels already exist). Add `matches`, `standings`, `leaderboard`, `quiz`, `bracket` to every locale file in `messages/`.

## Risks / Trade-offs

- [Active-state mismatch for nested routes] → Reuse the proven `isActive` prefix rule from `site-nav-client`; cover `matches/[matchId]` and `leaderboard?scope=…` with a test/scenario.
- [Format helper throws on malformed `format_config`] → Guard with the safe-parse path already in the schema module and default to always-on sections; never let the nav crash a page render.
- [Label drift across locales] → Add the same keys to all locale files in one change; a missing key surfaces as the key name, caught in review.
- [Horizontal overflow on small screens with 5 tabs] → Make the tab row horizontally scrollable (overflow-x-auto, no wrap) with the active tab scrolled into view, consistent with `admin-matches-tabs`.

## Migration Plan

Additive, non-breaking. Steps: (1) add i18n labels; (2) add the nav component (server + client); (3) render it in `[league]/layout.tsx`. No data migration, no route changes. Rollback = revert the layout render (nav simply disappears; all section routes keep working).

## Open Questions

- Should the label namespace reuse existing page-title translations (e.g. `matches.title`) rather than introduce `competitionNav.*`? Prefer a dedicated namespace for short nav labels distinct from page titles; confirm during implementation against the existing `messages/` structure.
