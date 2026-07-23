## Why

A competition (`/[locale]/[league]/…`) already has Matches, Standings, Bracket, Leaderboard, and Quiz pages, but nothing ties them together: each page is reached ad hoc via links scattered across the home lanes, catalog, and cross-page CTAs. There is no persistent way to move between a competition's sections, so the Leaderboard and Quiz in particular are effectively hidden once a visitor lands on Matches. A shared section navigation makes every section of a competition discoverable and reachable from one consistent place.

## What Changes

- Add a persistent, competition-scoped section navigation rendered from `[league]/layout.tsx` so it appears on every page beneath a competition.
- Surface the sections as tabs/links: **Matches**, **Standings**, **Leaderboard**, **Quiz**, and **Bracket**, each routing to the existing league-scoped page under `/[locale]/[league]/…`.
- Highlight the active section based on the current path, with correct `aria-current` semantics.
- Only show sections that apply to the competition: **Bracket** appears only when the competition format has a knockout stage; **Standings** appears only for formats that have a table.
- Make the nav responsive and mobile-first (horizontally scrollable / wrapping on small screens), matching the existing site-nav and admin-nav patterns.
- Add the section labels to the i18n message catalog (all supported locales).

## Capabilities

### New Capabilities
- `competition-section-nav`: Rules for the persistent, competition-scoped section navigation — which sections appear, how the active section is determined, conditional visibility by competition format, routing targets, and accessibility semantics.

### Modified Capabilities
<!-- No existing spec's requirements change; the underlying section pages keep their current behavior. -->

## Impact

- **Code**: `app/[locale]/[league]/layout.tsx` (render the nav), a new nav component (server + a small client piece for active-state, following `site-nav.tsx` / `site-nav-client.tsx`), and the i18n message files under `messages/`.
- **Data**: Reads the resolved competition (already available via `getLeagueFromContext`) to gate format-conditional sections; no schema or query changes.
- **APIs/dependencies**: None new.
- **UX**: Every competition page gains a consistent header for navigating between Matches, Standings, Leaderboard, Quiz, and Bracket.
