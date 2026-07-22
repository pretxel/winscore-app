## Why

The product is moving to its own domain (`winscore.me`) and needs a full-site rebrand to match. Country flag icons that were critical for World Cup 2026 identification are noise in a multi-league future. The match-comic gallery on the landing page adds clutter to an already content-heavy page. This change swaps the canonical domain, ships a refreshed favicon set, removes all country/locale flags from the UI, and strips the comic gallery from the landing page (the full comic pipeline remains intact).

## What Changes

- **Domain rebrand to winscore.me**: canonical URL, metadata base, JSON-LD, sitemap, webmanifest, OG images, email links — all resolve to `https://winscore.me`. `NEXT_PUBLIC_SITE_URL` and Vercel env docs are updated.
- **New favicon set**: `app/favicon.ico`, `app/icon.svg`, `app/icon.png`, `app/apple-icon.png` replaced with winscore.me-branded assets.
- **Remove country/locale flag SVGs and the TeamFlag component**: all 48 SVG files under `public/flags/`, the `TeamFlag` React component, the `TEAM_FLAG` mapping, `flagSlug()`, and the `LOCALE_FLAG_SLUG` map are deleted. Every consumer of `TeamFlag` (standings tables, match cards, fixtures strips, filters, bracket, leaderboard, live feed, team-wall, countdown) is reworked to drop flag rendering.
- **Remove landing-page comic gallery**: the "Match comics" section (`recent-recap-images.tsx`) is removed from the landing page. The full comic pipeline (prompt generation, Leonardo render, reactions, share, digest email, one-click, match-detail display) is **preserved** — only the landing-page gallery is removed.
- **Remove stale "World Cup 2026 Pool" remnant**: `public/site.webmanifest` still carries the old product name.
- **Update Logotype**: the wordmark glyphs ("WC" + edition) are updated to reflect the new brand.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `brand-identity`: Favicon set replaced with winscore.me-branded assets. Logotype glyphs updated. Webmanifest `name`/`short_name` changed to "Winscore" / "Winscore". Site metadata (`metadataBase`, OG image, title template, JSON-LD) resolves to `https://winscore.me`. `NEXT_PUBLIC_SITE_URL` env docs updated. Landing hero and tagline wording updated for multi-league framing.

### Removed Capabilities

- `landing-recent-recap-images`: landing-page gallery of recent comic images (the comic pipeline — generate, render, reactions, share, digest — remains fully intact)

## Impact

- **App code**: `components/team-flag.tsx`, `components/recent-recap-images.tsx`, `components/language-switcher.tsx` (flag rendering), `components/logotype.tsx`
- **Lib**: `lib/team-flag.ts`, `lib/i18n.ts` (`LOCALE_FLAG_SLUG`), `lib/env.ts`, `lib/competition.ts` (metadata generation)
- **Assets**: `public/flags/**` (48 SVGs), `app/favicon.ico`, `app/icon.svg`, `app/icon.png`, `app/apple-icon.png`, `public/site.webmanifest`
- **Landing page**: `app/[locale]/page.tsx` (comic gallery section removed)
- **i18n**: Stripping flag-related and landing-gallery message keys across `en`, `es`, `fr`, `de`
