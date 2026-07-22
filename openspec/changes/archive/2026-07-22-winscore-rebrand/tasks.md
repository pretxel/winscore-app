## 1. Domain rebrand to winscore.me

- [x] 1.1 Update `lib/env.ts` `resolveSiteUrl()` to default to `https://winscore.me` in production (after Vercel env vars).
- [x] 1.2 Update `README.md` `NEXT_PUBLIC_SITE_URL` example from `winscore.example.com` to `winscore.me`.
- [x] 1.3 Update `.env.example` / docker `.env` references to the production URL.
- [x] 1.4 Update `public/site.webmanifest`: `name` → "Winscore", `short_name` → "Winscore".
- [x] 1.5 Update `app/layout.tsx` + `app/[locale]/layout.tsx` default title/description to drop "World Cup 2026" edition references in favor of multi-league framing (e.g. "Daily Predictions & Live Leaderboard").
- [x] 1.6 Update `messages/en.json` `siteMeta.title` and `siteMeta.description` to match multi-league framing.

## 2. Favicon update

- [x] 2.1 Replace `app/favicon.ico` with a winscore.me-branded favicon (render from updated Logotype).
- [x] 2.2 Replace `app/icon.svg` with a winscore.me-branded SVG icon.
- [x] 2.3 Replace `app/icon.png` with a winscore.me-branded PNG icon (generated from icon.svg).
- [x] 2.4 Replace `app/apple-icon.png` with a winscore.me-branded apple touch icon.

## 3. Logotype update

- [x] 3.1 Redesign the `components/logotype.tsx` SVG glyphs to reflect the winscore.me brand mark (replace "WC" + edition tile + "Pool" suffix).
- [x] 3.2 Verify all three sizes (`xs`, `md`, `xl`) render correctly in nav, footer, hero, and OG image.
- [x] 3.3 Confirm the OG image (`app/opengraph-image.tsx`) renders the updated wordmark.

## 4. Landing page comic gallery removal

- [x] 4.1 Delete `components/recent-recap-images.tsx`.
- [x] 4.2 Remove the comic gallery section rendering from the landing page (`app/[locale]/page.tsx`).
- [x] 4.3 Remove the `recapGalleryEyebrow` i18n key from all 4 locale message files.

## 5. Flag removal

- [x] 5.1 Delete `public/flags/` directory (all 48 SVG files + README).
- [x] 5.2 Delete `lib/team-flag.ts` (`TEAM_FLAG` mapping + `flagSlug()`).
- [x] 5.3 Delete `components/team-flag.tsx`.
- [x] 5.4 Refactor `components/league-standings-table.tsx`: remove TeamFlag import and flag cell rendering.
- [x] 5.5 Refactor `components/live-events-feed.tsx`: remove TeamFlag import and flag rendering.
- [x] 5.6 Refactor `components/fixtures-strip.tsx`: remove TeamFlag import and flag rendering.
- [x] 5.7 Refactor `components/match-team-filter.tsx`: remove TeamFlag import and flag rendering.
- [x] 5.8 Refactor `components/mini-bracket.tsx`: remove TeamFlag import and flag rendering.
- [x] 5.9 Refactor `components/bracket-match-card.tsx`: remove TeamFlag import and flag rendering.
- [x] 5.10 Refactor `components/group-standings-table.tsx`: remove TeamFlag import and flag rendering.
- [x] 5.11 Refactor `components/live-match-list.tsx`: remove TeamFlag import and flag rendering.
- [x] 5.12 Refactor `components/team-flag-wall.tsx`: remove flag-path usage (replace with team-name-only rendering or delete the wall).
- [x] 5.13 Refactor `components/tournament-countdown.tsx`: remove `flagSlug` usage.
- [x] 5.14 Refactor `components/language-switcher.tsx`: remove `LOCALE_FLAG_SLUG` flag rendering (keep text-only locale labels).
- [x] 5.15 Remove `LOCALE_FLAG_SLUG` from `lib/i18n.ts`.

## 6. i18n cleanup

- [x] 6.1 Remove flag-related i18n keys if any exist in `messages/en.json`.
- [x] 6.2 Sync key removals to `messages/es.json`, `messages/fr.json`, `messages/de.json`.
- [x] 6.3 Remove stale "World Cup 2026 Pool" / "WC26 Pool" literals from any remaining message files.
- [x] 6.4 Update landing page hero/tagline i18n keys in all 4 locales for multi-league framing.

## 7. Verification

- [x] 7.1 `pnpm typecheck` — no type errors from deleted imports or refactored components.
- [x] 7.2 `pnpm lint` — no lint errors.
- [x] 7.3 `pnpm test` — all tests pass; update any tests referencing removed modules.
- [x] 7.4 `pnpm build` — compiles and generates static pages.
- [x] 7.5 Visually verify: favicon loads, logotype renders in nav/footer/hero/OG, no flags appear in UI, landing page has no comic gallery, domain resolves correctly.
